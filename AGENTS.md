# AGENTS.md

## Cursor Cloud specific instructions

This repository contains a single Jupyter notebook (`Cross_Validation.ipynb`) demonstrating cross-validation techniques (KNN, SVM, GridSearchCV, RandomizedSearchCV) on the Iris dataset.

### Dependencies

There is no `requirements.txt` in this repo. The update script installs the required packages:
`numpy`, `pandas`, `seaborn`, `matplotlib`, `scikit-learn`, `jupyter`, `nbconvert`, `ipykernel`.

### Running the notebook

- **Execute all cells headlessly:**
  ```
  jupyter nbconvert --to notebook --execute Cross_Validation.ipynb --output /tmp/executed.ipynb
  ```
- **Start Jupyter Lab for interactive editing:**
  ```
  jupyter lab --ip=0.0.0.0 --port=8888 --no-browser --NotebookApp.token=''
  ```

### PATH note

User-installed pip scripts land in `~/.local/bin`. The update script ensures this is on `PATH` via the shell profile. If commands like `jupyter` are not found, run `export PATH="$HOME/.local/bin:$PATH"`.
