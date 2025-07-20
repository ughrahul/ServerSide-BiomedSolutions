const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const authMiddleware = require("./js/authMiddleware");

const app = express();
const PORT = 3000;
const JWT_SECRET = "your-super-secret-key-that-no-one-can-guess";

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(express.static(__dirname));
app.get("/reset-password", (req, res) => {
  res.sendFile(path.join(__dirname, "reset-password.html"));
});

// --- Database Connection ---
const dbURI =
  "mongodb+srv://biomed_admin:biomed123@cluster0.xaqujnn.mongodb.net/biomed-website?retryWrites=true&w=majority&appName=Cluster0";
mongoose
  .connect(dbURI)
  .then(() => console.log("Successfully connected to MongoDB Atlas."))
  .catch((err) =>
    console.error(
      "DB Connection Error. Check string, IP access, and credentials.",
      err
    )
  );

// --- Image Upload Configuration ---
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
    cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
    );
  },
});
const upload = multer({ storage: storage });

// --- Database Schemas ---
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    imageUrl: { type: String, required: true },
    category: { type: String, required: true },
  },
  { timestamps: true }
); // Automatically adds createdAt and updatedAt

const messageSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    subject: String,
    message: String,
  },
  { timestamps: true }
); // Use timestamps for received date

const settingsSchema = new mongoose.Schema({
  phone: String,
  email: String,
  facebookUrl: String,
  instagramUrl: String,
  linkedInUrl: String,
});

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    avatarUrl: { type: String, default: "uploads/default-avatar.png" },
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  { timestamps: true }
);

// --- Database Models ---
const User = mongoose.model("User", userSchema);
const Product = mongoose.model("Product", productSchema);
const Message = mongoose.model("Message", messageSchema);
const Settings = mongoose.model("Setting", settingsSchema);

// --- NODEMAILER TRANSPORTER SETUP ---
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "hingmang75@gmail.com", // This should be your correct email
    pass: "fqgbznlbodzltuhb", // <-- PASTE THE NEW PASSWORD HERE
  },
});

transporter.verify(function (error, success) {
  if (error) {
    console.log("!!! NODEMAILER VERIFICATION ERROR !!!");
    console.log(
      "This means your credentials (email/password) are likely WRONG."
    );
    console.log("Please check your Gmail App Password and email address.");
    console.log(error);
  } else {
    console.log(
      "✅ Nodemailer is configured correctly and ready to send emails."
    );
  }
});

// ===================================================================
//                        API ENDPOINTS
// ===================================================================

app.get("/reset-password", (req, res) => {
  // It finds the HTML file by going up one directory (..) from /ServerSide/
  // and then looking for reset-password.html.
  res.sendFile(path.join(__dirname, "..", "reset-password.html"));
});

// --- Products API ---
app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Error fetching products." });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

app.post("/api/products", upload.single("productImage"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file uploaded." });
    }
    const { name, description, category } = req.body;
    const existingProduct = await Product.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });
    if (existingProduct) {
      return res
        .status(409)
        .json({ message: "A product with this name already exists." });
    }

    const newProduct = new Product({
      name,
      description,
      category,
      imageUrl: `uploads/${req.file.filename}`,
    });
    const savedProduct = await newProduct.save();
    res
      .status(201)
      .json({ message: "Product added successfully!", product: savedProduct });
  } catch (err) {
    console.error("Error in POST /api/products:", err);
    res.status(500).json({ message: "Server error while adding product." });
  }
});

app.put(
  "/api/products/:id",
  upload.single("productImage"),
  async (req, res) => {
    try {
      const { name, description, category } = req.body;
      const updateData = { name, description, category };
      if (req.file) {
        updateData.imageUrl = `uploads/${req.file.filename}`;
      }

      const updatedProduct = await Product.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );
      if (!updatedProduct)
        return res.status(404).json({ message: "Product not found" });

      res.json({
        message: "Product updated successfully!",
        product: updatedProduct,
      });
    } catch (err) {
      console.error("Error updating product:", err);
      res.status(500).json({ message: "Server error while updating product." });
    }
  }
);

app.delete("/api/products/:id", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: "Error deleting product." });
  }
});

// --- Messages API ---
app.get("/api/messages", async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Error fetching messages." });
  }
});

app.get("/api/messages/:id", async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Message not found" });
    res.json(message);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

app.post("/api/messages", async (req, res) => {
  try {
    const newMessage = new Message(req.body);
    await newMessage.save();
    res
      .status(201)
      .json({ message: "Message sent successfully!", data: newMessage });
  } catch (err) {
    res.status(400).json({ message: "Error sending message." });
  }
});

app.delete("/api/messages/:id", async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
    res.json({ message: "Message deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: "Error deleting message." });
  }
});

// --- Settings API ---
app.get("/api/settings", async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = new Settings({
      phone: "+977-1-5555555",
      email: "info@biomed.com.np",
      facebookUrl: "#",
      instagramUrl: "#",
      linkedInUrl: "#",
    });
    await settings.save();
  }
  res.json(settings);
});

app.post("/api/settings", async (req, res) => {
  const updatedSettings = await Settings.findOneAndUpdate({}, req.body, {
    new: true,
    upsert: true,
  });
  res.json(updatedSettings);
});

// --- User & Auth API ---
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "User with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new User({ fullName, email, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: "Admin user created successfully." });
  } catch (err) {
    res.status(500).json({ message: "Server error during registration." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    const token = jwt.sign(
      { userId: user._id, name: user.fullName },
      JWT_SECRET,
      { expiresIn: "1d" }
    );
    res.json({ token, userName: user.fullName, avatarUrl: user.avatarUrl });
  } catch (err) {
    res.status(500).json({ message: "Server error during login." });
  }
});

// --- NEW ENDPOINT: Forgot Password ---
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    console.log(`[1/5] Received password reset request for: ${req.body.email}`);

    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      // Security: Always send a generic success message to prevent hackers from guessing valid emails.
      console.log(
        `[2/5] User not found, but sending generic success response for security.`
      );
      return res.status(200).json({
        message:
          "If an account with that email exists, a recovery link has been sent.",
      });
    }
    console.log(`[2/5] User found: ${user.fullName}`);

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.passwordResetExpires = Date.now() + 3600000; // 1 hour

    await user.save();
    console.log(`[3/5] Reset token generated and saved to user record.`);

    const resetURL = `http://localhost:3000/reset-password?token=${resetToken}`;

    const mailOptions = {
      // THE FIX: The 'from' address MUST match the authenticated user.
      // This automatically uses the correct email from your transporter setup.
      from: `"Biomed Solutions Admin" <${transporter.options.auth.user}>`,
      to: user.email,
      subject: "Your Biomed Admin Password Reset Link",
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2>Password Reset Request</h2>
          <p>You requested a password reset for your Biomed Admin account.</p>
          <p>Please click the button below to set a new password. This link is only valid for one hour.</p>
          <a href="${resetURL}" style="display: inline-block; padding: 12px 25px; margin: 20px 0; font-size: 16px; color: #fff; background-color: #00aeff; text-decoration: none; border-radius: 5px;">Reset Your Password</a>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `,
    };

    console.log(
      `[4/5] Attempting to send email via Nodemailer to: ${user.email}`
    );

    // This now correctly awaits the email sending and will throw an error if it fails.
    await transporter.sendMail(mailOptions);

    console.log(`[5/5] ✅ Recovery email sent successfully!`);
    res.status(200).json({
      message:
        "If an account with that email exists, a recovery link has been sent.",
    });
  } catch (err) {
    // This CATCH block will now execute if ANY of the above steps fail.
    console.error("!!! FORGOT PASSWORD ENDPOINT ERROR !!!:", err);
    res.status(500).json({
      message:
        "Failed to send recovery email. Please check server logs for details.",
    });
  }
});

// --- NEW ENDPOINT: Reset Password ---
app.post("/api/auth/reset-password", async (req, res) => {
  const { token, password } = req.body;

  // 1. Hash the incoming token from the user to match what's in the DB
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  try {
    // 2. Find the user by the HASHED token and check if it's not expired
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }, // $gt means "greater than"
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Token is invalid or has expired." });
    }

    // 3. If the user and token are valid, update the password
    user.password = await bcrypt.hash(password, 12);

    // 4. Invalidate the token so it can't be used again
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    res.status(200).json({
      message: "Password has been reset successfully. Please log in.",
    });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    res.status(500).json({ message: "An error occurred on the server." });
  }
});

// --- GET CURRENT USER PROFILE ---
// Protected route to get the logged-in user's details
app.get("/api/auth/profile", authMiddleware, async (req, res) => {
  try {
    // req.user is added by the authMiddleware
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// --- UPDATE USER PROFILE ---
// Protected route to update name, avatar, and password
app.put(
  "/api/auth/profile",
  authMiddleware,
  upload.single("avatar"),
  async (req, res) => {
    try {
      const { fullName, currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user.userId);

      if (!user) return res.status(404).json({ message: "User not found." });

      // Update name if provided
      if (fullName) {
        user.fullName = fullName;
      }

      // Update avatar if a new file is uploaded
      if (req.file) {
        user.avatarUrl = `uploads/${req.file.filename}`;
      }

      // Securely update password if all fields are provided
      if (currentPassword && newPassword) {
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
          return res
            .status(401)
            .json({ message: "Incorrect current password." });
        }
        user.password = await bcrypt.hash(newPassword, 12);
      }

      const updatedUser = await user.save();

      res.json({
        message: "Profile updated successfully!",
        // Send back the new info so the frontend can update without a refresh
        userName: updatedUser.fullName,
        avatarUrl: updatedUser.avatarUrl,
      });
    } catch (err) {
      console.error("PROFILE UPDATE ERROR:", err);
      res.status(500).json({ message: "Server error while updating profile." });
    }
  }
);

// --- Start the Server ---
app.listen(PORT, () => {
  console.log(`Admin backend server running on http://localhost:${PORT}`);
});
