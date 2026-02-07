
#!/bin/bash

# Initialize git if not already done
if [ ! -d ".git" ]; then
  echo "Initializing Git repository..."
  git init
  git branch -M main
else
  echo "Git repository already initialized."
fi

# Add all files
echo "Adding files..."
git add .

# Commit
echo "Committing changes..."
git commit -m "feat: Initial commit of MakerFlow 3D pipeline"

# Add remote if not exists
if ! git remote | grep -q origin; then
  echo "Adding remote origin..."
  git remote add origin https://github.com/MasteraSnackin/MakerFlow-3D.git
else
  echo "Remote origin already exists. Updating URL..."
  git remote set-url origin https://github.com/MasteraSnackin/MakerFlow-3D.git
fi

# Push
echo "Pushing to GitHub..."
git push -u origin main

echo "Done! View your project at https://github.com/MasteraSnackin/MakerFlow-3D"
