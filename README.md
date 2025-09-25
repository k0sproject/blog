# k0s Team Blog — Adding a post (Hugo)

This repo powers the k0s team blog using [Hugo](https://gohugo.io/). If you can open a PR, you can publish a post.

## Quick start

1. Create a new post (Hugo “leaf bundle” with its own folder):

```sh
hugo new content/blog/my-post-title/index.md
```

2. Open the generated file and fill in front matter (see below).
3. Add any images/files into the **same folder** as the post (e.g., `content/blog/my-post-title/diagram.png`).
4. Preview locally:

```sh
hugo server -D
```

5. When ready to publish, set `draft: false` and open a PR.

---

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

**Notes**

* `date` is ISO-8601; use UTC or your local time.
* Leave `draft: true` while iterating; change to `false` to publish.
* Use `tags`/`categories` that already exist where possible.
* If the `summary` is omitted, the first paragraph in the article will be used as summary.

---

## Images & media

* Keep assets **inside the post’s folder** (leaf bundle).
  Example tree:

  ```
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

---

## Local preview

```sh
hugo server -D
```

* `-D` shows drafts.
* Visit the URL Hugo prints and verify formatting, links, code blocks, and images.

---

## Pull Request checklist

* [ ] `title`, `date`, `author`, `summary` set
* [ ] `draft: false` for publishing
* [ ] Images load; alt text present
* [ ] Links/code blocks render correctly
* [ ] No broken relative paths
* [ ] Post matches the tone and headings of existing posts

---

## Conventions

* **File/folder name**: use-kebab-case (`my-post-title`)
* **Code blocks**: use fenced blocks with language hints (e.g., `sh`, `yaml`)
* **Internal links**: prefer relative links within the repo

