#!/usr/bin/env python
"""Train a landmark-based sign classifier from a CSV file.

CSV format:
label,x0,y0,z0,x1,y1,z1,...,x20,y20,z20
hello,0.1,0.2,0.0,...
"""
import argparse
import csv
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


FEATURE_COUNT = 63


def normalize_flat_landmarks(values):
    landmarks = np.array(values, dtype=np.float32).reshape(21, 3)
    landmarks = landmarks - landmarks[0]
    scale = np.linalg.norm(landmarks[9]) or 1.0
    return (landmarks / scale).reshape(-1)


def load_dataset(csv_path: Path):
    labels = []
    features = []

    with csv_path.open(newline="", encoding="utf-8") as dataset:
        reader = csv.DictReader(dataset)
        feature_columns = [column for column in reader.fieldnames or [] if column != "label"]

        if "label" not in (reader.fieldnames or []):
            raise ValueError("CSV must include a 'label' column.")
        if len(feature_columns) != FEATURE_COUNT:
            raise ValueError(f"CSV must include {FEATURE_COUNT} landmark feature columns.")

        for row in reader:
            labels.append(row["label"])
            raw_features = [float(row[column]) for column in feature_columns]
            features.append(normalize_flat_landmarks(raw_features))

    return np.array(features, dtype=np.float32), np.array(labels)


def train(csv_path: Path, output_path: Path):
    features, labels = load_dataset(csv_path)
    x_train, x_test, y_train, y_test = train_test_split(
        features,
        labels,
        test_size=0.2,
        random_state=42,
        stratify=labels,
    )

    model = Pipeline(
        steps=[
            ("scaler", StandardScaler()),
            (
                "classifier",
                RandomForestClassifier(
                    n_estimators=250,
                    random_state=42,
                    class_weight="balanced",
                ),
            ),
        ]
    )
    model.fit(x_train, y_train)

    predictions = model.predict(x_test)
    print(classification_report(y_test, predictions))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": model, "classes": model.classes_.tolist()}, output_path)
    print(f"Saved model to {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Train the sign-language landmark classifier.")
    parser.add_argument("--csv", required=True, type=Path, help="Path to training CSV.")
    parser.add_argument(
        "--output",
        default=Path("backend/models/sign_model.joblib"),
        type=Path,
        help="Where to save the trained joblib model.",
    )
    args = parser.parse_args()
    train(args.csv, args.output)


if __name__ == "__main__":
    main()
