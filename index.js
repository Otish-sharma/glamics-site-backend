const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 5000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads')); // Serve uploaded files
app.use(express.static('public')); // Serve admin dashboard

// PostgreSQL connection configuration
// const pool = new Pool({
//   user: 'postgres',
//   host: 'localhost',
//   database: 'test',
//   password: 'otish',
//   port: 5432,
// });

const pool = new Pool({
  user: 'test_aliu_user',
  host: 'localhost',
  database: 'test_aliu',
  password: 'RhiBxsUS598u6wAOvDssn0pOyq0C9lmL',
  port: 5432,
});
// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error acquiring client', err.stack);
    return;
  }
  console.log('Connected to PostgreSQL database');
  release();
});

// Initialize database tables
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        image_url TEXT
      )
    `);

    // Update existing table if needed
    await pool.query(`
      ALTER TABLE categories ALTER COLUMN image_url TYPE TEXT
    `).catch(() => {});

    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        image_url TEXT,
        category_id INTEGER REFERENCES categories(id),
        rating DECIMAL(2,1) DEFAULT 5.0,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Update existing table if needed
    await pool.query(`
      ALTER TABLE products ALTER COLUMN image_url TYPE TEXT
    `).catch(() => {});

    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(100),
        review_text TEXT,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        image_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS collections (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_collections (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
        discount_percentage INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(product_id, collection_id)
      )
    `);

    // Insert sample data if tables are empty
    const categoryCount = await pool.query('SELECT COUNT(*) FROM categories');
    if (parseInt(categoryCount.rows[0].count) === 0) {
      await insertSampleData();
    }

    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
};

const insertSampleData = async () => {
  // Insert categories
  const categories = [
    { name: 'Men', image_url: '/men.jpg' },
    { name: 'Women', image_url: '/women.jpg' },
    { name: 'Kids', image_url: '/kids.jpg' },
    { name: 'Pants', image_url: '/pants.jpg' },
    { name: 'Jeans', image_url: '/jeans.jpg' },
    { name: 'Sweater', image_url: '/sweater.jpg' },
    { name: 'Shoe', image_url: '/shoe.jpg' }
  ];

  for (const cat of categories) {
    await pool.query(
      'INSERT INTO categories (name, image_url) VALUES ($1, $2)',
      [cat.name, cat.image_url]
    );
  }

  // Insert products
  const products = [
    { name: 'Orange Airsuit', price: 99.00, image_url: '/p1.jpg', category_id: 1 },
    { name: 'Blue Denim Jacket', price: 89.00, image_url: '/p2.jpg', category_id: 2 },
    { name: 'Kids Summer Dress', price: 45.00, image_url: '/p3.jpg', category_id: 3 },
    { name: 'Casual Pants', price: 65.00, image_url: '/p4.jpg', category_id: 4 },
    { name: 'Slim Fit Jeans', price: 79.00, image_url: '/p5.jpg', category_id: 5 },
    { name: 'Wool Sweater', price: 120.00, image_url: '/p6.jpg', category_id: 6 },
    { name: 'Running Shoes', price: 150.00, image_url: '/p7.jpg', category_id: 7 },
    { name: 'Cotton T-Shirt', price: 35.00, image_url: '/p8.jpg', category_id: 1 },
    { name: 'Floral Dress', price: 95.00, image_url: '/p9.jpg', category_id: 2 },
    { name: 'Kids Sneakers', price: 55.00, image_url: '/p10.jpg', category_id: 3 },
    { name: 'Chino Pants', price: 70.00, image_url: '/p11.jpg', category_id: 4 },
    { name: 'Ripped Jeans', price: 85.00, image_url: '/p12.jpg', category_id: 5 }
  ];

  for (const product of products) {
    await pool.query(
      'INSERT INTO products (name, price, image_url, category_id) VALUES ($1, $2, $3, $4)',
      [product.name, product.price, product.image_url, product.category_id]
    );
  }

  // Insert reviews
  const reviews = [
    {
      name: 'Esther Howard',
      role: 'Nursing Assistant',
      review_text: 'Praesent ut lacus a velit tincidunt aliquam a eget urna...',
      rating: 5,
      image_url: 'https://thumbs.dreamstime.com/z/young-man-portrait-18441696.jpg'
    },
    {
      name: 'John Doe',
      role: 'Medical Assistant',
      review_text: 'Praesent ut lacus a velit tincidunt aliquam a eget urna...',
      rating: 4,
      image_url: 'https://skyelitenews.com/wp-content/uploads/2020/08/25-Most-Handsome-Men-Globally-025.jpg'
    },
    {
      name: 'Leslie Alexander',
      role: 'Medical Assistant',
      review_text: 'Praesent ut lacus a velit tincidunt aliquam a eget urna...',
      rating: 4,
      image_url: 'https://tse3.mm.bing.net/th/id/OIP.4PKHhmaurdrjc-TNxT07QQHaJ2?r=0&w=500&h=665&rs=1&pid=ImgDetMain&o=7&rm=3'
    },
    {
      name: 'Esther Howard',
      role: 'Web Designer',
      review_text: 'Praesent ut lacus a velit tincidunt aliquam a eget urna...',
      rating: 5,
      image_url: 'https://tse1.mm.bing.net/th/id/OIP.CE1LsaoMEdetDP0kVZvkhgHaLG?r=0&rs=1&pid=ImgDetMain&o=7&rm=3'
    }
  ];

  for (const review of reviews) {
    await pool.query(
      'INSERT INTO reviews (name, role, review_text, rating, image_url) VALUES ($1, $2, $3, $4, $5)',
      [review.name, review.role, review.review_text, review.rating, review.image_url]
    );
  }
};

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'E-commerce API is running!' });
});

// Get all categories
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const { category, filter } = req.query;
    let query = `
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id
    `;
    const params = [];

    if (category) {
      query += ' WHERE c.name = $1';
      params.push(category);
    }

    if (filter === 'best-selling') {
      query += ' ORDER BY rating DESC, id';
    } else if (filter === 'top-rating') {
      query += ' ORDER BY rating DESC';
    } else {
      query += ' ORDER BY id';
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all reviews
app.get('/api/reviews', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reviews ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new review
app.post('/api/reviews', async (req, res) => {
  try {
    const { name, role, review_text, rating, image_url } = req.body;
    const result = await pool.query(
      'INSERT INTO reviews (name, role, review_text, rating, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, role, review_text, rating, image_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Newsletter subscription
app.post('/api/newsletter', async (req, res) => {
  try {
    const { email } = req.body;
    console.log('Newsletter subscription:', email);
    res.json({ message: 'Successfully subscribed to newsletter!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin Routes
// Add new product with image upload OR image URL
app.post('/api/admin/products', upload.single('image'), async (req, res) => {
  try {
    const { name, price, image_url, category_id, description } = req.body;
    
    // Priority: uploaded file > provided URL > null
    let finalImageUrl = null;
    if (req.file) {
      finalImageUrl = `/uploads/${req.file.filename}`;
    } else if (image_url && image_url.trim() !== '') {
      finalImageUrl = image_url;
    }
    
    const result = await pool.query(
      'INSERT INTO products (name, price, image_url, category_id, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, price, finalImageUrl, category_id, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update product with image upload OR image URL
app.put('/api/admin/products/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, image_url, category_id, description } = req.body;
    
    let query = 'UPDATE products SET name = $1, price = $2, category_id = $3, description = $4';
    let params = [name, price, category_id, description];
    
    // Priority: uploaded file > provided URL > keep existing
    if (req.file) {
      query += ', image_url = $5 WHERE id = $6 RETURNING *';
      params.push(`/uploads/${req.file.filename}`, id);
    } else if (image_url !== undefined) {
      query += ', image_url = $5 WHERE id = $6 RETURNING *';
      params.push(image_url, id);
    } else {
      query += ' WHERE id = $5 RETURNING *';
      params.push(id);
    }
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete product
app.delete('/api/admin/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new category with image upload OR image URL
app.post('/api/admin/categories', upload.single('image'), async (req, res) => {
  try {
    const { name, image_url } = req.body;
    
    // Priority: uploaded file > provided URL > null
    let finalImageUrl = null;
    if (req.file) {
      finalImageUrl = `/uploads/${req.file.filename}`;
    } else if (image_url && image_url.trim() !== '') {
      finalImageUrl = image_url;
    }
    
    const result = await pool.query(
      'INSERT INTO categories (name, image_url) VALUES ($1, $2) RETURNING *',
      [name, finalImageUrl]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update category
app.put('/api/admin/categories/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, image_url } = req.body;
    
    let query = 'UPDATE categories SET name = $1';
    let params = [name];
    
    // Priority: uploaded file > provided URL > keep existing
    if (req.file) {
      query += ', image_url = $2 WHERE id = $3 RETURNING *';
      params.push(`/uploads/${req.file.filename}`, id);
    } else if (image_url !== undefined) {
      query += ', image_url = $2 WHERE id = $3 RETURNING *';
      params.push(image_url, id);
    } else {
      query += ' WHERE id = $2 RETURNING *';
      params.push(id);
    }
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk add categories (for quick setup)
app.post('/api/admin/categories/bulk', async (req, res) => {
  try {
    const { categories } = req.body;
    const results = [];
    
    for (const cat of categories) {
      const result = await pool.query(
        'INSERT INTO categories (name, image_url) VALUES ($1, $2) RETURNING *',
        [cat.name, cat.image_url || null]
      );
      results.push(result.rows[0]);
    }
    
    res.status(201).json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete category
app.delete('/api/admin/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Initialize database and start server
initDB().then(() => {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
});

// Handle process termination
process.on('SIGINT', () => {
  pool.end(() => {
    console.log('Pool has ended');
    process.exit(0);
  });
});