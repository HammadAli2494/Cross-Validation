# AGENTS.md

## Cursor Cloud specific instructions

This repository contains a single Jupyter notebook (`Cross_Validation.ipynb`) demonstrating cross-validation techniques (KNN, SVM, GridSearchCV, RandomizedSearchCV) on the Iris dataset.

### Running the notebook

- **JupyterLab**: `jupyter lab --ip=0.0.0.0 --port=8888 --no-browser --NotebookApp.token="" --NotebookApp.password="" --allow-root`
- **Headless execution**: `jupyter nbconvert --to notebook --execute Cross_Validation.ipynb --output /tmp/executed.ipynb --ExecutePreprocessor.timeout=300`
- **As a script**: `jupyter nbconvert --to script Cross_Validation.ipynb --stdout | python3`

### Dependencies

All dependencies are installed via the update script (`pip install`). The packages needed are: `numpy`, `pandas`, `seaborn`, `matplotlib`, `scikit-learn`, `jupyter`.

### Notes

- Ensure `$HOME/.local/bin` is on `PATH` (pip installs CLI tools there).
- The notebook uses `sns.load_dataset('iris')` which fetches the dataset over the network on first run; seaborn caches it locally afterward.
- No databases, Docker, or external services are required.
