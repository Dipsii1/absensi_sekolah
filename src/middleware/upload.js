const multer = require("multer");
const path = require("path");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedMimes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
        "application/vnd.ms-excel",                                           // .xls
        "text/csv"                                                            // .csv
    ];
    const allowedExts = [".xlsx", ".xls", ".csv"];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error("Format file tidak didukung. Gunakan .xlsx, .xls, atau .csv"), false);
    }
};

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // maks 5MB
    fileFilter
});

module.exports = upload;