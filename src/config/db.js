import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
        console.log("Conectado a MongoDB localmente");
    } catch (error) {
        console.error("Error al conectar a MongoDB (Probablemente MongoDB no este levantado):", error.message);
        process.exit(1);
    }
};
