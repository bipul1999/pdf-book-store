import "dotenv/config";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import Book from "../models/Book.js";
import Category from "../models/Category.js";
import { connectDB } from "../config/db.js";

const uploadRoot = process.env.UPLOAD_DIR || "uploads";
const coverDir = path.join(uploadRoot, "covers");
const pdfDir = path.join(uploadRoot, "pdfs");

const categories = [
  { name: "Programming", slug: "programming", description: "Practical guides for software development." },
  { name: "Business", slug: "business", description: "Digital books for startups, sales, and operations." },
  { name: "Design", slug: "design", description: "UX, interface, and product design books." }
];

const books = [
  {
    title: "React Quick Start PDF",
    author: "PDF Book Store Team",
    category: "Programming",
    price: 199,
    featured: true,
    color: "#0f766e",
    description: "A focused beginner-friendly React guide covering components, hooks, routing, and production project structure."
  },
  {
    title: "Node API Blueprint",
    author: "Aarav Mehta",
    category: "Programming",
    price: 249,
    featured: true,
    color: "#e85d4f",
    description: "Learn how to build secure Express APIs with MongoDB models, JWT authentication, validation, uploads, and payments."
  },
  {
    title: "Digital Product Playbook",
    author: "Nisha Rao",
    category: "Business",
    price: 299,
    featured: true,
    color: "#25364a",
    description: "A practical playbook for planning, launching, pricing, and improving digital products with clear workflows."
  },
  {
    title: "UX Patterns for Web Apps",
    author: "Kabir Sen",
    category: "Design",
    price: 179,
    featured: true,
    color: "#7c3aed",
    description: "Reusable UX patterns for dashboards, checkout pages, forms, libraries, admin panels, and responsive interfaces."
  }
];

function ensureFiles() {
  fs.mkdirSync(coverDir, { recursive: true });
  fs.mkdirSync(pdfDir, { recursive: true });
}

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function coverSvg(book) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="960" viewBox="0 0 720 960">
  <rect width="720" height="960" fill="${book.color}"/>
  <rect x="54" y="54" width="612" height="852" rx="28" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.45)" stroke-width="4"/>
  <text x="90" y="170" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700">PDF Book Store</text>
  <text x="90" y="420" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="900">${book.title}</text>
  <text x="90" y="505" fill="rgba(255,255,255,0.85)" font-family="Arial, Helvetica, sans-serif" font-size="30">by ${book.author}</text>
  <text x="90" y="790" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="40" font-weight="800">Rs. ${book.price}</text>
  <text x="90" y="845" fill="rgba(255,255,255,0.8)" font-family="Arial, Helvetica, sans-serif" font-size="24">Demo PDF Edition</text>
</svg>`;
}

function demoPdf(book) {
  return `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 165 >>
stream
BT
/F1 24 Tf
72 710 Td
(${book.title}) Tj
0 -42 Td
/F1 14 Tf
(This is a demo PDF file for PDF Book Store.) Tj
0 -24 Td
(Replace it from the admin dashboard when adding real books.) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000251 00000 n 
0000000467 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
537
%%EOF`;
}

async function seedDemo() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing. Create server/.env first.");
  ensureFiles();
  await connectDB();

  const categoryDocs = {};
  for (const category of categories) {
    categoryDocs[category.name] = await Category.findOneAndUpdate(
      { slug: category.slug },
      category,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  for (const book of books) {
    const slug = slugify(book.title);
    const coverPath = path.join(coverDir, `${slug}.svg`);
    const pdfPath = path.join(pdfDir, `${slug}.pdf`);
    fs.writeFileSync(coverPath, coverSvg(book));
    fs.writeFileSync(pdfPath, demoPdf(book));

    await Book.findOneAndUpdate(
      { title: book.title },
      {
        title: book.title,
        author: book.author,
        category: categoryDocs[book.category]._id,
        description: book.description,
        price: book.price,
        coverImage: coverPath,
        pdfPath,
        featured: book.featured,
        isActive: true
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  console.log("Demo categories and books seeded.");
  await mongoose.disconnect();
}

seedDemo().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
