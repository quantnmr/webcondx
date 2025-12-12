# Deploying to GitHub Pages

This guide will help you deploy the `web-condx` directory to GitHub Pages.

## Prerequisites

- A GitHub account
- Git installed on your computer
- The repository should be named something like `condx` (not `quantnmr.github.io`)

## Steps

### 1. Initialize Git (if not already done)

```bash
cd /Users/scott/Writing/condx
git init
git add .
git commit -m "Initial commit with web-condx"
```

### 2. Create GitHub Repository

1. Go to [GitHub](https://github.com) and create a new repository
2. Name it `condx` (or whatever you prefer)
3. **Don't** initialize it with a README (you already have files)

### 3. Connect and Push

```bash
# Add your GitHub repository as remote
git remote add origin https://github.com/quantnmr/condx.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### 4. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under **Source**, select **GitHub Actions**
4. The workflow will automatically deploy when you push changes

### 5. Access Your Site

After the workflow runs (check the **Actions** tab), your site will be available at:
- `https://quantnmr.github.io/condx/`

(Replace `quantnmr` with your GitHub username and `condx` with your repository name)

## Alternative: Deploy to quantnmr.github.io

If you want to deploy to `https://quantnmr.github.io` directly (the main user site):

1. Create a repository named exactly `quantnmr.github.io`
2. Copy the contents of `web-condx/` to the root of that repository
3. Push to the `main` branch
4. Enable GitHub Pages in Settings → Pages (select `main` branch, `/ (root)` folder)

## Updating the Site

Simply push changes to the `main` branch:

```bash
git add .
git commit -m "Update web app"
git push
```

The GitHub Actions workflow will automatically rebuild and deploy your site.

