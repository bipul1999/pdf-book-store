import Category from "../models/Category.js";
import { clearPublicResponseCache } from "../middleware/publicResponseCache.js";

const slugify = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export async function listCategories(_req, res) {
  const categories = await Category.find().sort("name").lean();
  res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=1800");
  res.json({ categories });
}

export async function createCategory(req, res) {
  const category = await Category.create({
    name: req.body.name,
    slug: req.body.slug ? slugify(req.body.slug) : slugify(req.body.name),
    description: req.body.description || ""
  });
  clearPublicResponseCache("/api/categories");
  res.status(201).json({ category });
}

export async function updateCategory(req, res) {
  const category = await Category.findByIdAndUpdate(
    req.params.id,
    { ...req.body, ...(req.body.name && !req.body.slug ? { slug: slugify(req.body.name) } : {}) },
    { new: true, runValidators: true }
  );
  if (!category) return res.status(404).json({ message: "Category not found" });
  clearPublicResponseCache("/api/categories");
  clearPublicResponseCache("/api/books");
  res.json({ category });
}

export async function deleteCategory(req, res) {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) return res.status(404).json({ message: "Category not found" });
  clearPublicResponseCache("/api/categories");
  clearPublicResponseCache("/api/books");
  res.json({ message: "Category deleted" });
}
