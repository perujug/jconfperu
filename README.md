# JCONF Peru

This is the website for JCONF Peru (Java Conference Peru) - the premier Java conference in Peru for developers and users of Java technologies.

## 🌐 Live Sites

- **Production**: [https://jconfperu.com](https://jconfperu.com)
- **Preview/Sandbox**: [https://jconfperu-etqvmqfyo-dario-lunas-projects.vercel.app](https://jconfperu-etqvmqfyo-dario-lunas-projects.vercel.app)

## Local Development

This website is built with Jekyll and can be served locally for development.

### Prerequisites

- Ruby 2.7.0 or higher
- Bundler gem

### Setup

1. **Install dependencies:**
   ```bash
   bundle install
   ```

2. **Start the development server:**
   ```bash
   bundle exec jekyll serve
   ```

3. **Open your browser and navigate to:**
   ```
   http://localhost:4000
   ```

### Development with Live Reload

For automatic browser refresh when files change:

```bash
bundle exec jekyll serve --livereload
```

This will start:
- Main site: http://localhost:4000
- LiveReload server: http://localhost:35729

### Additional Commands

- **Build the site (without serving):**
  ```bash
  bundle exec jekyll build
  ```

- **Serve with custom port:**
  ```bash
  bundle exec jekyll serve --port 3000
  ```

- **Stop the server:**
  Press `Ctrl+C` in the terminal where Jekyll is running

### Troubleshooting

If you encounter permission errors during `bundle install`, the project is configured to install gems locally in the `vendor/bundle` directory to avoid system permission issues.

## 🚀 Deployment & Preview System

This project uses a dual deployment strategy with automatic preview deployments for pull requests.

### How It Works

#### Production Deployment
- **Trigger**: Push to `master` branch
- **URL**: `https://jconfperu.com` (custom domain)
- **Purpose**: Live production site

#### Preview Deployment (Sandbox)
- **Trigger**: Pull request to `master` branch
- **URL**: `https://jconfperu-pr-{PR_NUMBER}-dario-lunas-projects.vercel.app` (unique URL per PR)
- **Purpose**: Testing and review before merging

### Workflow

#### 1. Create a Pull Request
When you create a pull request targeting the `master` branch:

1. **Automatic Build**: GitHub Actions builds the Jekyll site
2. **Unique Preview Deployment**: Deploys to Vercel with a unique URL per PR
3. **PR Comment**: Automatically adds a comment with the unique preview URL

#### 2. Review Process
- **Test Changes**: Use the preview URL to test your changes
- **Share with Team**: Share the preview URL for team review
- **Iterate**: Push more commits to update the preview

#### 3. Merge to Production
When you merge the pull request:
- **Production Deployment**: Automatically deploys to `jconfperu.com`
- **Preview Cleanup**: Vercel automatically cleans up the unique preview deployment

### Unique Preview URLs

Each pull request gets its own unique preview URL:

- **PR #1**: `https://jconfperu-pr-1-dario-lunas-projects.vercel.app`
- **PR #2**: `https://jconfperu-pr-2-dario-lunas-projects.vercel.app`
- **PR #3**: `https://jconfperu-pr-3-dario-lunas-projects.vercel.app`
- And so on...

### Troubleshooting Deployments

#### Preview Not Deploying
1. Check GitHub Actions logs
2. Verify Vercel secrets are correct
3. Ensure pull request targets `master` branch

#### Preview URL Not Working
1. Wait 2-3 minutes for deployment to complete
2. Check Vercel dashboard for deployment status
3. Verify the URL in the PR comment

#### Production Not Updating
1. Check if PR was merged to `master`
2. Verify GitHub Actions workflow completed
3. Check Vercel dashboard for production deployment
