# jconfperu
This is the website for jconfperu, it means java day in Peru!

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
