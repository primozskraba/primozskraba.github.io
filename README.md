# Personal website: Primoz Skraba

A static site for GitHub Pages. It needs no build step: plain HTML, CSS and JavaScript.

## Layout

```
index.html                 the page
assets/css/style.css       styles (light and dark themes)
assets/js/publications.js  the publication list: edit this to add papers
assets/js/main.js          renders publications, search/filter, dark mode
assets/img/                photo, figures, favicon
papers/                    PDFs linked from publications
CV.pdf                     CV
.nojekyll                  tells GitHub Pages to serve files as-is
```

## Adding a paper

Open `assets/js/publications.js`, copy an entry, and put it at the top of the right year:

```js
{
  title: "Title of the Paper",
  authors: "A. Coauthor, P. Skraba",
  venue: "Journal Name 12(3), 45–67",   // or "Preprint" / "Manuscript"
  year: 2026, type: "journal",          // journal | conference | preprint | other
  doi: "10.xxxx/xxxxx", arxiv: "2601.01234", pdf: "papers/file.pdf"  // all optional
},
```

The four newest entries appear under "Latest papers" on the home section automatically.

## Preview locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploy to GitHub Pages

1. Create a public repo named `<username>.github.io`.
2. Push these files to its `main` branch.
3. In the repo, go to Settings → Pages → Source: "Deploy from a branch", `main`, `/ (root)`.
4. The site is live at `https://<username>.github.io` within a minute or two.

## Keeping the pskraba.org domain (optional)

1. Add a file named `CNAME` containing `pskraba.org` and push it.
2. At your domain registrar, point DNS at GitHub:
   - `A` records for `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `CNAME` record for `www`: `<username>.github.io`
3. Settings → Pages: enter `pskraba.org` as the custom domain and tick "Enforce HTTPS" once it is available.

Do step 1 only when you are ready to switch DNS: once `CNAME` exists, `<username>.github.io` redirects to pskraba.org.
