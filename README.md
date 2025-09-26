# The Zero Friction Kubernetes Blog

The repository that powers the [k0sproject community blog][blog] static site.
Built with [Hugo] and the [PaperMod] theme. If you can open a pull request, you
can publish a post.

[blog]: https://blog.k0sproject.io/
[Hugo]: https://gohugo.io/
[PaperMod]: https://github.com/adityatelange/hugo-PaperMod

## Quick start

1. Create a new post (Hugo "leaf bundle" with its own folder):

   ```sh
   hugo new content/posts/my-post-title/index.md
   ```

2. Open the generated file and fill in front matter (see below).

3. Add any images/files into the **same folder** as the post (e.g.,
   `content/posts/my-post-title/diagram.png`).

4. Preview locally:

   ```sh
   hugo server -D
   ```

5. When ready to publish, set `draft: false` and open a pull request.

## Front matter (copy–paste)

```yaml
---
title: "Your Post Title"
date: 2025-09-25T09:00:00Z
author: "Your Name"
tags: ["k0s", "kubernetes", "how-to"]
draft: true
cover:
  image: "cover.png"                 # relative to this post folder
  caption: "Image caption"
# Optional
# summary: "1–2 sentence summary for list pages."
# description: "SEO description (140–160 chars)"
# canonicalURL: "https://example.com/original"
# categories: ["Engineering"]
---
```

Write Markdown content **below** the front matter.

Additional notes:

* `date` is ISO-8601; use UTC or your local time.
* Leave `draft: true` while iterating; change to `false` to publish.
* Use `tags`/`categories` that already exist where possible.
* If the `summary` is omitted, the first paragraph in the article will be used
  as summary.

## Images & media

* Keep assets **inside the post's folder** (leaf bundle).
  Example tree:

  ```text
  content/blog/my-post-title/
  ├─ index.md
  ├─ cover.png
  └─ diagram.png
  ```

* Reference them with relative paths:

  ```md
  ![Control plane layout](./diagram.png)
  ```

* Optional Hugo figure shortcode:

  ```md
  {{< figure src="diagram.png" caption="Control plane layout" >}}
  ```

* Aim for small files (<1 MB). Add meaningful alt text.

## Local development

Prerequisites:

* Git (for cloning the repository and its submodule)
* Hugo **extended** version (0.120.0 or newer recommended)

```sh
git clone https://github.com/k0sproject/blog.git blog.k0sproject.io
cd blog.k0sproject.io
git submodule update --init --recursive
```

Start a live-reloading development server (Hugo watches for changes and
refreshes the browser automatically):

```sh
hugo server --buildDrafts --buildFuture
```

Visit <http://localhost:1313/> to preview the site. This approach ensures assets
such as CSS are served correctly; loading `public/index.html` directly from the
filesystem will usually miss theme assets because the site is built with the
production `baseURL`.

## Pull request checklist

* [ ] `title`, `date`, `author`, `summary` set
* [ ] `draft: false` for publishing
* [ ] Images load; alt text present
* [ ] Links/code blocks render correctly
* [ ] No broken relative paths
* [ ] Post matches the tone and headings of existing posts

## Conventions

* **File/folder name**: use-kebab-case (`my-post-title`)
* **Code blocks**: use fenced blocks with language hints (e.g., `sh`, `yaml`)
* **Internal links**: prefer relative links within the repository

## License

Content and configuration are distributed under the Creative Commons
Attribution-ShareAlike 4.0 International license. See `LICENSE` for the
full text.
