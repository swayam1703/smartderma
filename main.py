import io
import torch
import torch.nn as nn
from torchvision import models, transforms
from torchvision.models import EfficientNet_B3_Weights
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from datetime import datetime

# ----------------------------
# 0. Class Labels
# ----------------------------
class_names = [
    "Acne", "Actinic_Keratosis", "Basal Cell Carcinoma", "Eczema", "Melanoma",
    "Moles", "Psoriasis", "Seborrheic_Keratoses", "Sun_Damage", "Tinea",
    "Unknown_Normal", "Vitiligo", "Warts"
]

# ----------------------------
# 1. Create FastAPI app
# ----------------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------
# 2. Ensemble Model Definition
# ----------------------------
class EnsembleModel(nn.Module):
    def _init_(self, num_classes=13, weights=(0.5, 0.5, 0.0)):
        super(EnsembleModel, self)._init_()
        self.weights = weights

        # EfficientNetB3
        self.model_eff = models.efficientnet_b3(weights=EfficientNet_B3_Weights.IMAGENET1K_V1)
        self.model_eff.classifier[1] = nn.Linear(self.model_eff.classifier[1].in_features, num_classes)

        # DenseNet121
        self.model_dense = models.densenet121(weights=None)
        self.model_dense.classifier = nn.Linear(self.model_dense.classifier.in_features, num_classes)

        # MobileNetV3
        self.model_mobile = models.mobilenet_v3_large(weights=None)
        self.model_mobile.classifier[3] = nn.Linear(self.model_mobile.classifier[3].in_features, num_classes)

    def forward(self, img_eff, img_std):
        with torch.no_grad():
            out_eff = torch.softmax(self.model_eff(img_eff), dim=1)
            out_dense = torch.softmax(self.model_dense(img_std), dim=1)
            out_mobile = torch.softmax(self.model_mobile(img_std), dim=1)
        return self.weights[0]*out_eff + self.weights[1]*out_dense + self.weights[2]*out_mobile

# ----------------------------
# 3. Load the model weights
# ----------------------------
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
ensemble_model = EnsembleModel(num_classes=13)
ensemble_model.load_state_dict(torch.load("ensemble_model_weights.pth", map_location=device))
ensemble_model.to(device)
ensemble_model.eval()

# ----------------------------
# 4. Test route
# ----------------------------
@app.get("/test-models")
def test_models():
    try:
        dummy_std = torch.randn(1, 3, 224, 224).to(device)
        dummy_eff = torch.randn(1, 3, 300, 300).to(device)
        _ = ensemble_model(dummy_eff, dummy_std)
        return {"status": "success", "message": "Model loaded and working"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ----------------------------
# 5. Predict route
# ----------------------------
@app.post("/predict/")
async def predict(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")

        # Transforms
        transform_std = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])
        transform_eff = transforms.Compose([
            transforms.Resize((300, 300)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])

        img_std = transform_std(image).unsqueeze(0).to(device)
        img_eff = transform_eff(image).unsqueeze(0).to(device)

        # Run prediction
        outputs = ensemble_model(img_eff, img_std)
        predicted_class = torch.argmax(outputs, dim=1).item()
        predicted_label = class_names[predicted_class]
        confidence = torch.max(outputs).item() * 100

        # Recommendations
        recommendations = {
            "Acne": ["Use topical treatments like benzoyl peroxide.", "Consult a dermatologist for severe cases."],
            "Actinic_Keratosis": ["Use sunblock regularly.", "Consult a dermatologist for possible biopsy."],
            "Basal Cell Carcinoma": ["Seek medical advice for possible excision.", "Avoid sun exposure."],
            "Eczema": ["Moisturize regularly.", "Use anti-itch creams."],
            "Melanoma": ["Immediate consultation with a dermatologist.", "Get a biopsy of the affected area."],
            "Moles": ["Keep track of changes in size or color.", "Consult if any abnormal changes are noticed."],
            "Psoriasis": ["Use medicated shampoos and creams.", "Consult a dermatologist for light therapy."],
            "Seborrheic_Keratoses": ["Consider cryotherapy.", "Consult for removal if needed."],
            "Sun_Damage": ["Use sunscreen daily.", "Consult a dermatologist for treatments."],
            "Tinea": ["Use antifungal creams or medication.", "Consult if symptoms persist."],
            "Unknown_Normal": ["No immediate action required.", "Monitor skin condition periodically."],
            "Vitiligo": ["Use makeup or topical treatments.", "Consult for possible repigmentation therapy."],
            "Warts": ["Use over-the-counter treatments.", "Consult for cryotherapy or laser treatment."]
        }

        return {
            "prediction": predicted_label,
            "confidence": confidence,
            "recommendations": recommendations.get(predicted_label, []),
            "image_metadata": {
                "filename": file.filename,
                "upload_date": datetime.utcnow().isoformat()
            }
        }

    except Exception as e:
        return JSONResponse(content={"status": "error", "message": str(e)}, status_code=400)