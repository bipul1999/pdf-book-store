import Category from "../models/Category.js";

const slugify = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export async function listCategories(_req, res) {
  const categories = await Category.find().sort("name");
  res.json({ categories });
}

export async function createCategory(req, res) {
  const category = await Category.create({
    name: req.body.name,
    slug: req.body.slug ? slugify(req.body.slug) : slugify(req.body.name),
    description: req.body.description || ""
  });
  res.status(201).json({ category });
}

export async function updateCategory(req, res) {
  const category = await Category.findByIdAndUpdate(
    req.params.id,
    { ...req.body, ...(req.body.name && !req.body.slug ? { slug: slugify(req.body.name) } : {}) },
    { new: true, runValidators: true }
  );
  if (!category) return res.status(404).json({ message: "Category not found" });
  res.json({ category });
}

export async function deleteCategory(req, res) {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) return res.status(404).json({ message: "Category not found" });
  res.json({ message: "Category deleted" });
}
