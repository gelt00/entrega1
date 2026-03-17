import mongoose from "mongoose";

const tokenSchema = new mongoose.Schema({
    refreshToken: {
        type: String,
        required: true,
        unique: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: '1d'
    }
});

export const Token = mongoose.model("Token", tokenSchema);
