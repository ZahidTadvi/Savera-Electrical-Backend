import User from "../models/User.js";
import { successResponse, errorResponse } from "../helper/sucessAndError.js";
import bcrypt from "bcryptjs";

// Get user profile
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json(errorResponse(404, "User not found"));
    }

    res.json(successResponse(200, "Profile retrieved successfully", user));
  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json(errorResponse(500, "Failed to get profile", error.message));
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    console.log('🔍 Profile Controller - Starting updateProfile');
    console.log('🔍 Profile Controller - req.user:', req.user);
    console.log('🔍 Profile Controller - req.body:', req.body);
    
    const userId = req.user?.id;
    if (!userId) {
      console.error('🔍 Profile Controller - No user ID found in request');
      return res.status(401).json(errorResponse(401, "User not authenticated"));
    }
    
    const { name, email, currentPassword, newPassword, avatar } = req.body;

    // Find the user (include password field for comparison)
    let user;
    try {
      user = await User.findById(userId).select('+password');
      console.log('🔍 Profile Controller - User ID:', userId);
      console.log('🔍 Profile Controller - User found:', user ? 'Yes' : 'No');
      console.log('🔍 Profile Controller - User password exists:', user?.password ? 'Yes' : 'No');
      console.log('🔍 Profile Controller - User password type:', typeof user?.password);
    } catch (dbError) {
      console.error('🔍 Profile Controller - Database error finding user:', dbError);
      return res.status(500).json(errorResponse(500, "Database error", dbError.message));
    }
    
    if (!user) {
      console.log('🔍 Profile Controller - User not found in database');
      return res.status(404).json(errorResponse(404, "User not found"));
    }

    // Prepare update data
    const updateData = {};
    
    // Update name if provided
    if (name && name.trim()) {
      updateData.name = name.trim();
    }

    // Update email if provided
    if (email && email.trim()) {
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ 
        email: email.trim(), 
        _id: { $ne: userId } 
      });
      
      if (existingUser) {
        return res.status(400).json(errorResponse(400, "Email already exists"));
      }
      
      updateData.email = email.trim();
    }

    // Update password if provided
    if (currentPassword && newPassword) {
      console.log('🔍 Profile Controller - Password update requested');
      console.log('🔍 Profile Controller - currentPassword type:', typeof currentPassword);
      console.log('🔍 Profile Controller - newPassword type:', typeof newPassword);
      console.log('🔍 Profile Controller - user.password type:', typeof user.password);
      console.log('🔍 Profile Controller - user.password length:', user.password?.length);
      console.log('🔍 Profile Controller - user.password value:', user.password ? 'exists' : 'undefined');
      
      // Validate inputs
      if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
        console.log('🔍 Profile Controller - Password validation failed: not strings');
        return res.status(400).json(errorResponse(400, "Password fields must be strings"));
      }

      // Check if user has a password (for existing users)
      const hasPasswordField = 'password' in user;
      const passwordValue = user.password;
      
      console.log('🔍 Profile Controller - User has password field:', hasPasswordField);
      console.log('🔍 Profile Controller - Password value:', passwordValue);
      console.log('🔍 Profile Controller - Password type:', typeof passwordValue);
      
      if (!hasPasswordField || !passwordValue || passwordValue === '' || passwordValue === null || passwordValue === undefined) {
        console.log('🔍 Profile Controller - User password not found or empty');
        console.log('🔍 Profile Controller - User password field exists:', 'password' in user);
        console.log('🔍 Profile Controller - User password value:', user.password);
        console.log('🔍 Profile Controller - User password type:', typeof user.password);
        
        // If user doesn't have a password, allow setting one without current password verification
        console.log('🔍 Profile Controller - Allowing password creation without current password verification');
        
        // Validate new password
        if (newPassword.length < 6) {
          return res.status(400).json(errorResponse(400, "New password must be at least 6 characters"));
        }

        // Hash new password
        const saltRounds = 10;
        updateData.password = await bcrypt.hash(newPassword, saltRounds);
        console.log('🔍 Profile Controller - New password created successfully');
      } else {
        // User has a password, verify current password
        console.log('🔍 Profile Controller - User has existing password, verifying current password');
        console.log('🔍 Profile Controller - About to compare passwords');
        console.log('🔍 Profile Controller - currentPassword:', currentPassword);
        console.log('🔍 Profile Controller - user.password:', user.password);
        
        try {
          const isCurrentPasswordValid = await bcrypt.compare(currentPassword, passwordValue);
          console.log('🔍 Profile Controller - Password comparison result:', isCurrentPasswordValid);
          
          if (!isCurrentPasswordValid) {
            return res.status(400).json(errorResponse(400, "Current password is incorrect"));
          }
        } catch (bcryptError) {
          console.error('🔍 Profile Controller - bcrypt.compare error:', bcryptError);
          console.error('🔍 Profile Controller - bcrypt error details:', {
            message: bcryptError.message,
            currentPasswordType: typeof currentPassword,
            userPasswordType: typeof passwordValue,
            currentPasswordLength: currentPassword?.length,
            userPasswordLength: passwordValue?.length
          });
          return res.status(500).json(errorResponse(500, "Password comparison failed", bcryptError.message));
        }

        // Validate new password
        if (newPassword.length < 6) {
          return res.status(400).json(errorResponse(400, "New password must be at least 6 characters"));
        }

        // Hash new password
        const saltRounds = 10;
        updateData.password = await bcrypt.hash(newPassword, saltRounds);
        console.log('🔍 Profile Controller - New password hashed successfully');
      }
    }

    // Update avatar if provided
    if (avatar !== undefined) {
      updateData.avatar = avatar;
    }

    // Update the user
    let updatedUser;
    try {
      console.log('🔍 Profile Controller - About to update user with data:', updateData);
      updatedUser = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      ).select('-password');
      console.log('🔍 Profile Controller - User updated successfully');
    } catch (updateError) {
      console.error('🔍 Profile Controller - Error updating user:', updateError);
      return res.status(500).json(errorResponse(500, "Failed to update user", updateError.message));
    }

    res.json(successResponse(200, "Profile updated successfully", updatedUser));
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json(errorResponse(500, "Failed to update profile", error.message));
  }
};

// Upload profile image
export const uploadProfileImage = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json(errorResponse(400, "No image file provided"));
    }

    // Build a web-accessible URL (not a filesystem path)
    // e.g. '/uploads/profiles/<filename>' which should be served statically by Express
    const avatarUrl = `/uploads/profiles/${req.file.filename}`;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { avatar: avatarUrl },
      { new: true }
    ).select('-password');

    res.json(successResponse(200, "Profile image uploaded successfully", {
      user: updatedUser,
      avatarUrl: avatarUrl
    }));
  } catch (error) {
    console.error('Error uploading profile image:', error);
    res.status(500).json(errorResponse(500, "Failed to upload profile image", error.message));
  }
};
