import { Router } from "express";
import { createOperator, createOccupant, getAllUsers, updateOperator, updateOccupant, deleteUser } from "../controllers/adminController";
import { getAllAssetMasters, createAssetMaster, updateAssetMaster, deleteAssetMaster } from "../controllers/assetMasterController";
import { getAllRooms, getRoomById, createRoom, updateRoom, deleteRoom, checkoutRoom } from "../controllers/roomController";
import { authenticateToken, authorizeRole } from "../middlewares/authMiddleware";

const router = Router();

// Semua route di sini harus melewati: 1) Cek token
router.use(authenticateToken);

// ── User Management ─────────────────────────────────────
// Hanya ADMIN yang bisa mengelola user (RBAC: user_management)
// GET  /api/admin/users       - Lihat semua user
router.get("/users", authorizeRole(["ADMIN", "OPERATOR"]), getAllUsers);
// POST /api/admin/operators   - Buat user Operator baru
router.post("/operators", authorizeRole(["ADMIN"]), createOperator);
// POST /api/admin/occupants   - Buat user Occupant baru
router.post("/occupants", authorizeRole(["ADMIN", "OPERATOR"]), createOccupant);
// PUT  /api/admin/operators/:id - Edit user Operator
router.put("/operators/:id", authorizeRole(["ADMIN"]), updateOperator);
// PUT  /api/admin/occupants/:id - Edit user Occupant
router.put("/occupants/:id", authorizeRole(["ADMIN", "OPERATOR"]), updateOccupant);
// DELETE /api/admin/users/:id   - Hapus user
router.delete("/users/:id", authorizeRole(["ADMIN", "OPERATOR"]), deleteUser);

// ── Asset Master CRUD ────────────────────────────────────
// ADMIN dan OPERATOR bisa mengelola asset master (RBAC: asset_management)
// GET    /api/admin/asset-masters       - Lihat semua asset master
router.get("/asset-masters", authorizeRole(["ADMIN", "OPERATOR"]), getAllAssetMasters);
// POST   /api/admin/asset-masters       - Buat asset master baru
router.post("/asset-masters", authorizeRole(["ADMIN", "OPERATOR"]), createAssetMaster);
// PUT    /api/admin/asset-masters/:id   - Update asset master
router.put("/asset-masters/:id", authorizeRole(["ADMIN", "OPERATOR"]), updateAssetMaster);
// DELETE /api/admin/asset-masters/:id   - Hapus asset master
router.delete("/asset-masters/:id", authorizeRole(["ADMIN", "OPERATOR"]), deleteAssetMaster);

// ── Room CRUD ────────────────────────────────────────────
// ADMIN dan OPERATOR bisa mengelola kamar (RBAC: room_management)
// GET    /api/admin/rooms       - Lihat semua kamar
router.get("/rooms", authorizeRole(["ADMIN", "OPERATOR"]), getAllRooms);
// POST   /api/admin/rooms       - Buat kamar baru (+ assign aset dari asset master)
router.post("/rooms", authorizeRole(["ADMIN", "OPERATOR"]), createRoom);
// GET    /api/admin/rooms/:id   - Lihat detail 1 kamar
router.get("/rooms/:id", authorizeRole(["ADMIN", "OPERATOR"]), getRoomById);
// PUT    /api/admin/rooms/:id   - Update info kamar
router.put("/rooms/:id", authorizeRole(["ADMIN", "OPERATOR"]), updateRoom);
// DELETE /api/admin/rooms/:id   - Hapus kamar
router.delete("/rooms/:id", authorizeRole(["ADMIN", "OPERATOR"]), deleteRoom);
// PATCH /api/admin/rooms/:id/checkout - Checkout kamar
router.patch("/rooms/:id/checkout", authorizeRole(["ADMIN", "OPERATOR"]), checkoutRoom);

// ── Maintenance Log CRUD ─────────────────────────────────
import { getMaintenanceLogs, createMaintenanceLog, updateMaintenanceLog, deleteMaintenanceLog } from "../controllers/maintenanceController";

// GET    /api/admin/maintenance/:assetId       - Lihat semua log maintenance untuk aset tertentu
router.get("/maintenance/:assetId", authorizeRole(["ADMIN", "OPERATOR"]), getMaintenanceLogs);
// POST   /api/admin/maintenance/:assetId       - Buat log maintenance baru
router.post("/maintenance/:assetId", authorizeRole(["ADMIN", "OPERATOR"]), createMaintenanceLog);
// PUT    /api/admin/maintenance/log/:id        - Update log maintenance
router.put("/maintenance/log/:id", authorizeRole(["ADMIN", "OPERATOR"]), updateMaintenanceLog);
// DELETE /api/admin/maintenance/log/:id        - Hapus log maintenance
router.delete("/maintenance/log/:id", authorizeRole(["ADMIN", "OPERATOR"]), deleteMaintenanceLog);

export default router;
