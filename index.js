const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const { body, validationResult, param } = require("express-validator");
const path = require("path");
const fs = require("fs");
const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors()); // Allow all origins

const PORT = process.env.PORT || 3000;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary storage for multer
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "books-api", // Folder name in Cloudinary
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [
      { width: 800, height: 1200, crop: "limit" }, // Resize large images
      { quality: "auto" }, // Auto optimize quality
    ],
    public_id: (req, file) => {
      // Generate unique filename
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      return `book-${uniqueSuffix}`;
    },
  },
});

// Fallback to local storage if Cloudinary is not configured
const localFileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync("uploads")) {
      fs.mkdirSync("uploads");
    }
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "book-" + uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter for image validation
const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

// Use Cloudinary if configured, otherwise use local storage
// Temporarily force local storage for testing: change to localFileStorage
const upload = multer({
  storage: process.env.CLOUDINARY_CLOUD_NAME
    ? cloudinaryStorage
    : localFileStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Debug middleware to log upload details
app.use("/api/books", (req, res, next) => {
  console.log("Request method:", req.method);
  console.log("Content-Type:", req.get("Content-Type"));
  next();
});

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Books API",
      version: "1.0.0",
      description:
        "A comprehensive API for managing books with MongoDB and Express.js",
      contact: {
        name: "API Support",
        email: "support@booksapi.com",
      },
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Development server",
      },
    ],
    components: {
      schemas: {
        Book: {
          type: "object",
          required: ["title", "author", "description"],
          properties: {
            _id: {
              type: "string",
              description: "MongoDB ObjectId",
              example: "64f5a1b2c3d4e5f6a7b8c9d0",
            },
            title: {
              type: "string",
              maxLength: 200,
              description: "Book title",
              example: "The Great Gatsby",
            },
            author: {
              type: "string",
              maxLength: 100,
              description: "Book author",
              example: "F. Scott Fitzgerald",
            },
            description: {
              type: "string",
              minLength: 10,
              maxLength: 1000,
              description: "Book description",
              example:
                "A classic American novel about the Jazz Age and the American Dream",
            },
            image: {
              type: "string",
              description: "URL to book cover image",
              example:
                "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/books-api/book-1234567890-123456789.jpg",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Creation timestamp",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Last update timestamp",
            },
          },
        },
        BookInput: {
          type: "object",
          required: ["title", "author", "description"],
          properties: {
            title: {
              type: "string",
              maxLength: 200,
              description: "Book title",
              example: "The Great Gatsby",
            },
            author: {
              type: "string",
              maxLength: 100,
              description: "Book author",
              example: "F. Scott Fitzgerald",
            },
            description: {
              type: "string",
              minLength: 10,
              maxLength: 1000,
              description: "Book description",
              example:
                "A classic American novel about the Jazz Age and the American Dream",
            },
            image: {
              type: "string",
              format: "binary",
              description: "Book cover image file",
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            message: {
              type: "string",
              example: "Error message",
            },
            errors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: {
                    type: "string",
                  },
                  message: {
                    type: "string",
                  },
                },
              },
            },
          },
        },
        Success: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            message: {
              type: "string",
              example: "Operation successful",
            },
            data: {
              $ref: "#/components/schemas/Book",
            },
          },
        },
        BooksList: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            data: {
              type: "array",
              items: {
                $ref: "#/components/schemas/Book",
              },
            },
            pagination: {
              type: "object",
              properties: {
                currentPage: {
                  type: "integer",
                  example: 1,
                },
                totalPages: {
                  type: "integer",
                  example: 5,
                },
                totalBooks: {
                  type: "integer",
                  example: 47,
                },
                hasNextPage: {
                  type: "boolean",
                  example: true,
                },
                hasPrevPage: {
                  type: "boolean",
                  example: false,
                },
                limit: {
                  type: "integer",
                  example: 10,
                },
              },
            },
          },
        },
      },
    },
  },
  apis: ["./index.js"], // Path to the API docs
};

const specs = swaggerJSDoc(swaggerOptions);
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Books API Documentation",
  })
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploaded images (only needed for local storage)
app.use("/uploads", express.static("uploads"));

// Create uploads directory if it doesn't exist (only needed for local storage)
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// Book Schema
const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  author: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },
  image: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
bookSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Book = mongoose.model("Book", bookSchema);

// Input validation rules
const addBookValidation = [
  body("title")
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 1, max: 200 })
    .withMessage("Title must be between 1 and 200 characters")
    .trim(),

  body("author")
    .notEmpty()
    .withMessage("Author is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Author must be between 1 and 100 characters")
    .trim(),

  body("description")
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ min: 10, max: 1000 })
    .withMessage("Description must be between 10 and 1000 characters")
    .trim(),
];

const getBookValidation = [
  param("id").isMongoId().withMessage("Invalid book ID format"),
];

// Error handling middleware for validation
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Clean up uploaded file if validation fails
    if (req.file) {
      // For local storage
      if (req.file.path) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("Error deleting local file:", err);
        });
      }
      // For Cloudinary, the file is already uploaded, so we need to delete it
      if (req.file.public_id) {
        cloudinary.uploader.destroy(req.file.public_id, (error, result) => {
          if (error) console.error("Error deleting Cloudinary file:", error);
        });
      }
    }

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};

// Routes

/**
 * @swagger
 * /api/books:
 *   post:
 *     summary: Add a new book
 *     description: Create a new book with title, author, description, and optional image upload
 *     tags: [Books]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/BookInput'
 *     responses:
 *       201:
 *         description: Book created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// 1. Add a new book
app.post(
  "/api/books",
  upload.single("image"),
  addBookValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { title, author, description } = req.body;

      const bookData = {
        title,
        author,
        description,
      };

      // Debug logging
      console.log("Request file:", req.file);
      console.log(
        "Cloudinary configured:",
        !!process.env.CLOUDINARY_CLOUD_NAME
      );

      // Add image URL based on storage type
      if (req.file) {
        if (process.env.CLOUDINARY_CLOUD_NAME) {
          // Cloudinary storage - use the secure_url from Cloudinary
          bookData.image = req.file.path || req.file.secure_url || req.file.url;
          console.log("Cloudinary image URL:", bookData.image);
        } else {
          // Local storage - use local path
          bookData.image = `/uploads/${req.file.filename}`;
          console.log("Local image path:", bookData.image);
        }
      } else {
        console.log("No file uploaded");
      }

      console.log("Book data before saving:", bookData);

      const book = new Book(bookData);
      const savedBook = await book.save();

      console.log("Saved book:", savedBook);

      res.status(201).json({
        success: true,
        message: "Book added successfully",
        data: savedBook,
      });
    } catch (error) {
      console.error("Error saving book:", error);

      // Clean up uploaded file if database save fails
      if (req.file) {
        if (process.env.CLOUDINARY_CLOUD_NAME && req.file.public_id) {
          // Delete from Cloudinary
          cloudinary.uploader.destroy(
            req.file.public_id,
            (cloudinaryError, result) => {
              if (cloudinaryError)
                console.error(
                  "Error deleting Cloudinary file:",
                  cloudinaryError
                );
            }
          );
        } else if (req.file.path) {
          // Delete local file
          fs.unlink(req.file.path, (err) => {
            if (err) console.error("Error deleting local file:", err);
          });
        }
      }

      if (error.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: Object.values(error.errors).map((err) => ({
            field: err.path,
            message: err.message,
          })),
        });
      }

      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/books/{id}:
 *   get:
 *     summary: Get a single book by ID
 *     description: Retrieve a specific book using its MongoDB ObjectId
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: MongoDB ObjectId of the book
 *         schema:
 *           type: string
 *           example: "64f5a1b2c3d4e5f6a7b8c9d0"
 *     responses:
 *       200:
 *         description: Book found successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Book'
 *       400:
 *         description: Invalid book ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Book not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// 2. Get a single book by ID
app.get(
  "/api/books/:id",
  getBookValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const book = await Book.findById(req.params.id);

      if (!book) {
        return res.status(404).json({
          success: false,
          message: "Book not found",
        });
      }

      res.json({
        success: true,
        data: book,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/books:
 *   get:
 *     summary: List all books
 *     description: Retrieve a paginated list of books with optional search and sorting
 *     tags: [Books]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of books per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter books by title, author, or description
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [title, author, createdAt, updatedAt]
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order (ascending or descending)
 *     responses:
 *       200:
 *         description: Books retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BooksList'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// 3. List all books with optional pagination and search
app.get("/api/books", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    // Build search query
    let searchQuery = {};
    if (search) {
      searchQuery = {
        $or: [
          { title: { $regex: search, $options: "i" } },
          { author: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ],
      };
    }

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Get total count for pagination info
    const totalBooks = await Book.countDocuments(searchQuery);
    const totalPages = Math.ceil(totalBooks / limit);

    // Fetch books with pagination and sorting
    const books = await Book.find(searchQuery)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      data: books,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalBooks: totalBooks,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit: limit,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Check if the API is running and responsive
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Books API is running"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-06-14T10:30:00.000Z"
 */
// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Books API is running",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Global error handler
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum size is 5MB.",
      });
    }
  }

  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error: error.message,
  });
});

// Start server
app.listen(PORT, async () => {
  // MongoDB connection
  await mongoose
    .connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));

  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`API Documentation: http://localhost:${PORT}/api-docs`);

  // Log storage configuration
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    console.log("Using Cloudinary for image storage");
  } else {
    console.log("Using local storage for images");
  }
});

module.exports = app;
