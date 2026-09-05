"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiError } from "@/lib/api/client";
import { usersService } from "@/features/users/services/users.service";
import type {
  AdminUser,
  OccupantOccupation,
  OccupantDetails,
  OperatorDetails,
  ProfileStatus,
  UserRole,
} from "@/features/users/types/users";

type CreateRole = "OPERATOR" | "OCCUPANT";
type RoleFilter = "ALL" | UserRole;
type StatusFilter = "ALL" | ProfileStatus;
type SortFilter = "LATEST_CREATED" | "LATEST_EDITED" | "NAME_ASC";

type CreateUserForm = {
  role: CreateRole;
  email: string;
  password: string;
  name: string;
  phoneNumber: string;
  address: string;
  occupation: OccupantOccupation;
};

type EditUserForm = {
  email: string;
  password: string;
  name: string;
  phoneNumber: string;
  address: string;
  status: ProfileStatus;
  occupation: OccupantOccupation;
};

type CrudModalProps = {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  maxWidthClass?: string;
};

const defaultCreateForm: CreateUserForm = {
  role: "OPERATOR",
  email: "",
  password: "",
  name: "",
  phoneNumber: "",
  address: "",
  occupation: "BEKERJA",
};

const defaultEditForm: EditUserForm = {
  email: "",
  password: "",
  name: "",
  phoneNumber: "",
  address: "",
  status: "ACTIVE",
  occupation: "BEKERJA",
};

function CrudModal({
  title,
  description,
  onClose,
  children,
  maxWidthClass = "max-w-2xl",
}: CrudModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Tutup modal"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <section
        role="dialog"
        aria-modal="true"
        className={`relative z-10 w-full ${maxWidthClass} rounded-2xl border border-gray-200 bg-white shadow-xl`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-gray-200 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
          >
            x
          </button>
        </header>

        <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
      </section>
    </div>
  );
}

function getUserProfile(user: AdminUser): OperatorDetails | OccupantDetails | null {
  if (user.role === "OPERATOR") {
    return user.operatorDetails ?? null;
  }

  if (user.role === "OCCUPANT") {
    return user.occupantDetails ?? null;
  }

  return null;
}

function roleLabel(role: UserRole) {
  if (role === "ADMIN") {
    return "Admin";
  }

  if (role === "OPERATOR") {
    return "Operator";
  }

  return "Tenant";
}

function profileStatusLabel(status: ProfileStatus | null) {
  if (status === "ACTIVE") {
    return "Active";
  }

  if (status === "DEACTIVE") {
    return "Nonaktif";
  }

  return "-";
}

function occupationLabel(occupation?: OccupantOccupation) {
  if (occupation === "BEKERJA") {
    return "Bekerja";
  }

  if (occupation === "KULIAH") {
    return "Kuliah";
  }

  return "-";
}

function accountBadgeClass(status: ProfileStatus | null) {
  if (status === "ACTIVE") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "DEACTIVE") {
    return "bg-rose-100 text-rose-800";
  }

  return "bg-gray-100 text-gray-700";
}

function roleBadgeClass(role: UserRole) {
  if (role === "ADMIN") {
    return "bg-blue-100 text-blue-800";
  }

  if (role === "OPERATOR") {
    return "bg-indigo-100 text-indigo-800";
  }

  return "bg-gray-100 text-gray-800";
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Terjadi kesalahan saat memproses permintaan pengguna.";
}

function buildSearchIndex(user: AdminUser): string {
  const profile = getUserProfile(user);
  return [
    user.email,
    profile?.name ?? "",
    profile?.phoneNumber ?? "",
    profile?.address ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

function buildEditForm(user: AdminUser): EditUserForm {
  const profile = getUserProfile(user);

  return {
    email: user.email,
    password: "",
    name: profile?.name ?? "",
    phoneNumber: profile?.phoneNumber ?? "",
    address: profile?.address ?? "",
    status: profile?.status ?? "ACTIVE",
    occupation: user.occupantDetails?.occupation ?? "BEKERJA",
  };
}

function toTimestamp(value?: string | null) {
  if (!value) {
    return Number.NaN;
  }

  return Date.parse(value);
}

function getLatestEditedTimestamp(user: AdminUser) {
  const profile = getUserProfile(user);
  const userUpdatedAt = toTimestamp(user.updatedAt);
  const profileUpdatedAt = toTimestamp(profile?.updatedAt);
  const hasUserUpdatedAt = !Number.isNaN(userUpdatedAt);
  const hasProfileUpdatedAt = !Number.isNaN(profileUpdatedAt);

  if (hasUserUpdatedAt && hasProfileUpdatedAt) {
    return Math.max(userUpdatedAt, profileUpdatedAt);
  }

  if (hasUserUpdatedAt) {
    return userUpdatedAt;
  }

  if (hasProfileUpdatedAt) {
    return profileUpdatedAt;
  }

  return Number.NaN;
}

function sortUsersByLatestCreated(data: AdminUser[]) {
  return [...data].sort((left, right) => {
    const leftCreatedAt = toTimestamp(left.createdAt);
    const rightCreatedAt = toTimestamp(right.createdAt);
    const hasLeftCreatedAt = !Number.isNaN(leftCreatedAt);
    const hasRightCreatedAt = !Number.isNaN(rightCreatedAt);

    if (hasLeftCreatedAt && hasRightCreatedAt && leftCreatedAt !== rightCreatedAt) {
      return rightCreatedAt - leftCreatedAt;
    }

    if (hasLeftCreatedAt && !hasRightCreatedAt) {
      return -1;
    }

    if (!hasLeftCreatedAt && hasRightCreatedAt) {
      return 1;
    }

    return 0;
  });
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortFilter, setSortFilter] = useState<SortFilter>("LATEST_CREATED");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CreateUserForm>(defaultCreateForm);
  const [editForm, setEditForm] = useState<EditUserForm>(defaultEditForm);
  const [createError, setCreateError] = useState("");
  const [editError, setEditError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const loadUsers = useCallback(async () => {
    try {
      const response = await usersService.getAllUsers();
      setUsers(sortUsersByLatestCreated(response.users));
      setFetchError("");
    } catch (error) {
      setFetchError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadUsers();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    let data = [...users];
    const initialOrder = new Map(users.map((user, index) => [user.id, index]));

    if (normalizedQuery) {
      data = data.filter((user) => buildSearchIndex(user).includes(normalizedQuery));
    }

    if (roleFilter !== "ALL") {
      data = data.filter((user) => user.role === roleFilter);
    }

    if (statusFilter !== "ALL") {
      data = data.filter((user) => getUserProfile(user)?.status === statusFilter);
    }

    if (sortFilter === "LATEST_CREATED") {
      data.sort((left, right) => {
        const leftCreatedAt = toTimestamp(left.createdAt);
        const rightCreatedAt = toTimestamp(right.createdAt);
        const hasLeftCreatedAt = !Number.isNaN(leftCreatedAt);
        const hasRightCreatedAt = !Number.isNaN(rightCreatedAt);

        if (hasLeftCreatedAt && hasRightCreatedAt && leftCreatedAt !== rightCreatedAt) {
          return rightCreatedAt - leftCreatedAt;
        }

        if (hasLeftCreatedAt && !hasRightCreatedAt) {
          return -1;
        }

        if (!hasLeftCreatedAt && hasRightCreatedAt) {
          return 1;
        }

        return (initialOrder.get(left.id) ?? 0) - (initialOrder.get(right.id) ?? 0);
      });
    }

    if (sortFilter === "LATEST_EDITED") {
      data.sort((left, right) => {
        const leftEditedAt = getLatestEditedTimestamp(left);
        const rightEditedAt = getLatestEditedTimestamp(right);
        const hasLeftEditedAt = !Number.isNaN(leftEditedAt);
        const hasRightEditedAt = !Number.isNaN(rightEditedAt);

        if (hasLeftEditedAt && hasRightEditedAt && leftEditedAt !== rightEditedAt) {
          return rightEditedAt - leftEditedAt;
        }

        if (hasLeftEditedAt && !hasRightEditedAt) {
          return -1;
        }

        if (!hasLeftEditedAt && hasRightEditedAt) {
          return 1;
        }

        const leftCreatedAt = toTimestamp(left.createdAt);
        const rightCreatedAt = toTimestamp(right.createdAt);
        const hasLeftCreatedAt = !Number.isNaN(leftCreatedAt);
        const hasRightCreatedAt = !Number.isNaN(rightCreatedAt);

        if (hasLeftCreatedAt && hasRightCreatedAt && leftCreatedAt !== rightCreatedAt) {
          return rightCreatedAt - leftCreatedAt;
        }

        return (initialOrder.get(left.id) ?? 0) - (initialOrder.get(right.id) ?? 0);
      });
    }

    if (sortFilter === "NAME_ASC") {
      data.sort((left, right) => {
        const leftName = (getUserProfile(left)?.name ?? "System Admin").toLowerCase();
        const rightName = (getUserProfile(right)?.name ?? "System Admin").toLowerCase();
        return leftName.localeCompare(rightName, "id");
      });
    }

    return data;
  }, [roleFilter, searchQuery, sortFilter, statusFilter, users]);

  const detailUser = useMemo(
    () => users.find((user) => user.id === detailUserId) ?? null,
    [detailUserId, users]
  );

  const editUser = useMemo(
    () => users.find((user) => user.id === editUserId) ?? null,
    [editUserId, users]
  );

  const deleteUser = useMemo(
    () => users.find((user) => user.id === deleteUserId) ?? null,
    [deleteUserId, users]
  );

  const totalUsers = users.length;
  const totalAdmins = users.filter((user) => user.role === "ADMIN").length;
  const totalOperators = users.filter((user) => user.role === "OPERATOR").length;
  const totalOccupants = users.filter((user) => user.role === "OCCUPANT").length;

  const handleResetFilters = () => {
    setSearchQuery("");
    setRoleFilter("ALL");
    setStatusFilter("ALL");
    setSortFilter("LATEST_CREATED");
  };

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedbackMessage("");
    setCreateError("");
    setIsSubmitting(true);

    try {
      if (createForm.role === "OPERATOR") {
        const response = await usersService.createOperator({
          email: createForm.email,
          password: createForm.password,
          name: createForm.name,
          phoneNumber: createForm.phoneNumber,
          address: createForm.address,
        });
        setFeedbackMessage(response.message);
      } else {
        const response = await usersService.createOccupant({
          email: createForm.email,
          password: createForm.password,
          name: createForm.name,
          phoneNumber: createForm.phoneNumber,
          address: createForm.address,
          occupation: createForm.occupation,
        });
        setFeedbackMessage(response.message);
      }

      setCreateForm((prev) => ({
        ...defaultCreateForm,
        role: prev.role,
      }));
      setCreateError("");
      setIsCreateModalOpen(false);

      setIsLoading(true);
      setFetchError("");
      await loadUsers();
    } catch (error) {
      setCreateError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (userId: string) => {
    const selectedUser = users.find((user) => user.id === userId) ?? null;

    setFeedbackMessage("");
    setEditForm(selectedUser ? buildEditForm(selectedUser) : defaultEditForm);
    setEditError(selectedUser ? "" : "User data not found.");
    setEditUserId(userId);
  };

  const openDeleteModal = (userId: string) => {
    setFeedbackMessage("");
    setDeleteError("");
    setDeleteUserId(userId);
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editUser) {
      return;
    }

    setEditError("");
    setFeedbackMessage("");

    if (editUser.role === "ADMIN") {
      setEditError("Admin role account does not have a specific update endpoint.");
      return;
    }

    const email = editForm.email.trim();
    const name = editForm.name.trim();
    const phoneNumber = editForm.phoneNumber.trim();
    const address = editForm.address.trim();

    if (!email || !name || !phoneNumber || !address) {
      setEditError("Email, name, phone number, and address are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const basePayload = {
        email,
        name,
        phoneNumber,
        address,
        status: editForm.status,
        ...(editForm.password.trim()
          ? { password: editForm.password.trim() }
          : {}),
      };

      const response =
        editUser.role === "OPERATOR"
          ? await usersService.updateOperator(editUser.id, basePayload)
          : await usersService.updateOccupant(editUser.id, {
              ...basePayload,
              occupation: editForm.occupation,
            });

      setFeedbackMessage(response.message);
      setEditUserId(null);
      setIsLoading(true);
      setFetchError("");
      await loadUsers();
    } catch (error) {
      setEditError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteUser) {
      return;
    }

    setDeleteError("");
    setFeedbackMessage("");
    setIsSubmitting(true);

    try {
      const response = await usersService.remove(deleteUser.id);
      setFeedbackMessage(response.message);
      setDeleteUserId(null);
      setIsLoading(true);
      setFetchError("");
      await loadUsers();
    } catch (error) {
      setDeleteError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Manajemen Pengguna</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 md:text-base">
            Atur akun admin, operator, dan penghuni beserta status akses dan data
            profilnya dalam satu alur kerja.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setFeedbackMessage("");
                setCreateError("");
                setIsCreateModalOpen(true);
              }}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
            >Add User</button>

            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                setFetchError("");
                void loadUsers();
              }}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
            >Reload</button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Total Pengguna
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-gray-900">
            {totalUsers}
          </p>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Admin
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-gray-900">
            {totalAdmins}
          </p>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Operator
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-gray-900">
            {totalOperators}
          </p>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Tenant</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-gray-900">
            {totalOccupants}
          </p>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Hasil Filter
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-gray-900">
            {filteredUsers.length}
          </p>
        </article>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="flex flex-col gap-1 xl:col-span-2">
            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Cari Pengguna
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
              }}
              placeholder="Cari nama, email, nomor HP"
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Role
            </span>
            <select
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value as RoleFilter);
              }}
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value="ALL">Semua Role</option>
              <option value="ADMIN">Admin</option>
              <option value="OPERATOR">Operator</option>
              <option value="OCCUPANT">Tenant</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Status Akun
            </span>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as StatusFilter);
              }}
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value="ALL">Semua Status</option>
              <option value="ACTIVE">Active</option>
              <option value="DEACTIVE">Nonaktif</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Urutkan
            </span>
            <select
              value={sortFilter}
              onChange={(event) => {
                setSortFilter(event.target.value as SortFilter);
              }}
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value="LATEST_CREATED">Terbaru Ditambahkan</option>
              <option value="LATEST_EDITED">Last Edited</option>
              <option value="NAME_ASC">Nama A-Z</option>
            </select>
          </label>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      {fetchError && (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {fetchError}
        </section>
      )}

      {feedbackMessage && (
        <section className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {feedbackMessage}
        </section>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="px-4 py-10 text-center text-sm text-gray-500">Memuat data pengguna...</div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="border-r border-gray-200 px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      Nama
                    </th>
                    <th className="border-r border-gray-200 px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      Kontak
                    </th>
                    <th className="border-r border-gray-200 px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      Role
                    </th>
                    <th className="border-r border-gray-200 px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      Status Akun
                    </th>
                    <th className="border-r border-gray-200 px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">Address</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                        Tidak ada data pengguna yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const profile = getUserProfile(user);
                      const name = profile?.name ?? "System Admin";
                      const phoneNumber = profile?.phoneNumber ?? "-";
                      const address = profile?.address ?? "-";
                      const status = profile?.status ?? null;

                      return (
                        <tr
                          key={user.id}
                          className="border-b border-gray-200 transition hover:bg-gray-50"
                        >
                          <td className="border-r border-gray-200 px-4 py-3 align-top">
                            <p className="text-sm font-semibold text-gray-900">{name}</p>
                          </td>
                          <td className="border-r border-gray-200 px-4 py-3 align-top">
                            <p className="text-sm text-gray-800">{user.email}</p>
                            <p className="mt-1 text-sm text-gray-600">{phoneNumber}</p>
                          </td>
                          <td className="border-r border-gray-200 px-4 py-3 align-top">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleBadgeClass(
                                user.role
                              )}`}
                            >
                              {roleLabel(user.role)}
                            </span>
                          </td>
                          <td className="border-r border-gray-200 px-4 py-3 align-top">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${accountBadgeClass(
                                status
                              )}`}
                            >
                              {profileStatusLabel(status)}
                            </span>
                          </td>
                          <td className="border-r border-gray-200 px-4 py-3 align-top text-sm text-gray-700">
                            {address}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => setDetailUserId(user.id)}
                                className="inline-flex h-8 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                              >Detail</button>
                              <button
                                type="button"
                                onClick={() => openEditModal(user.id)}
                                className="inline-flex h-8 items-center justify-center rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700"
                              >Edit</button>
                              <button
                                type="button"
                                onClick={() => openDeleteModal(user.id)}
                                className="inline-flex h-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
                              >Delete</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-4 lg:hidden">
              {filteredUsers.length === 0 ? (
                <article className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
                  Tidak ada data pengguna yang cocok dengan filter.
                </article>
              ) : (
                filteredUsers.map((user) => {
                  const profile = getUserProfile(user);
                  const name = profile?.name ?? "System Admin";
                  const phoneNumber = profile?.phoneNumber ?? "-";
                  const address = profile?.address ?? "-";
                  const status = profile?.status ?? null;

                  return (
                    <article
                      key={`${user.id}-mobile`}
                      className="rounded-xl border border-gray-200 bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">{name}</p>
                        </div>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleBadgeClass(
                            user.role
                          )}`}
                        >
                          {roleLabel(user.role)}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <p className="text-gray-600">Email</p>
                        <p className="text-right text-gray-900">{user.email}</p>
                        <p className="text-gray-600">Nomor HP</p>
                        <p className="text-right text-gray-900">{phoneNumber}</p>
                        <p className="text-gray-600">Address</p>
                        <p className="text-right text-gray-900">{address}</p>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${accountBadgeClass(
                            status
                          )}`}
                        >
                          {profileStatusLabel(status)}
                        </span>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setDetailUserId(user.id)}
                            className="inline-flex h-8 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                          >Detail</button>
                          <button
                            type="button"
                            onClick={() => openEditModal(user.id)}
                            className="inline-flex h-8 items-center justify-center rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700"
                          >Edit</button>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(user.id)}
                            className="inline-flex h-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
                          >Delete</button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </>
        )}
      </section>

      {isCreateModalOpen && (
        <CrudModal
          title="Add New User"
          description="Form ini terhubung ke endpoint create operator/penghuni."
          onClose={() => {
            setCreateError("");
            setIsCreateModalOpen(false);
          }}
          maxWidthClass="max-w-3xl"
        >
          <form className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" onSubmit={handleCreateSubmit}>
            {createError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 md:col-span-2 xl:col-span-3">
                {createError}
              </div>
            ) : null}
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                Role
              </span>
              <select
                value={createForm.role}
                onChange={(event) => {
                  setCreateForm((prev) => ({
                    ...prev,
                    role: event.target.value as CreateRole,
                  }));
                }}
                className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              >
                <option value="OPERATOR">Operator</option>
                <option value="OCCUPANT">Tenant</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                Email
              </span>
              <input
                type="email"
                value={createForm.email}
                onChange={(event) => {
                  setCreateForm((prev) => ({ ...prev, email: event.target.value }));
                }}
                required
                className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                placeholder="nama@email.com"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                Password
              </span>
              <input
                type="password"
                value={createForm.password}
                onChange={(event) => {
                  setCreateForm((prev) => ({ ...prev, password: event.target.value }));
                }}
                required
                minLength={6}
                className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                placeholder="Minimal 6 karakter"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                Nama
              </span>
              <input
                type="text"
                value={createForm.name}
                onChange={(event) => {
                  setCreateForm((prev) => ({ ...prev, name: event.target.value }));
                }}
                required
                className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                placeholder="Nama pengguna"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                Nomor HP
              </span>
              <input
                type="text"
                value={createForm.phoneNumber}
                onChange={(event) => {
                  setCreateForm((prev) => ({
                    ...prev,
                    phoneNumber: event.target.value,
                  }));
                }}
                required
                className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                placeholder="08xxxxxxxxxx"
              />
            </label>

            {createForm.role === "OCCUPANT" && (
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  Occupation
                </span>
                <select
                  value={createForm.occupation}
                  onChange={(event) => {
                    setCreateForm((prev) => ({
                      ...prev,
                      occupation: event.target.value as OccupantOccupation,
                    }));
                  }}
                  className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                >
                  <option value="BEKERJA">Bekerja</option>
                  <option value="KULIAH">Kuliah</option>
                </select>
              </label>
            )}

            <label className="flex flex-col gap-1 md:col-span-2 xl:col-span-3">
              <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Address</span>
              <input
                type="text"
                value={createForm.address}
                onChange={(event) => {
                  setCreateForm((prev) => ({ ...prev, address: event.target.value }));
                }}
                required
                className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                placeholder="Alamat lengkap"
              />
            </label>

            <div className="md:col-span-2 xl:col-span-3 flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Saving..." : "Save User"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setCreateForm((prev) => ({ ...defaultCreateForm, role: prev.role }));
                  setCreateError("");
                }}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
              >
                Reset Form
              </button>
            </div>
          </form>
        </CrudModal>
      )}

      {detailUser && (
        <CrudModal
          title="Detail Pengguna"
          description="Informasi pengguna dipilih dari data terbaru API."
          onClose={() => setDetailUserId(null)}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Nama</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {getUserProfile(detailUser)?.name ?? "System Admin"}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Email</p>
              <p className="mt-1 text-sm text-gray-900">{detailUser.email}</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Role</p>
              <p className="mt-1 text-sm text-gray-900">{roleLabel(detailUser.role)}</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Status</p>
              <p className="mt-1 text-sm text-gray-900">
                {profileStatusLabel(getUserProfile(detailUser)?.status ?? null)}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Nomor HP</p>
              <p className="mt-1 text-sm text-gray-900">
                {getUserProfile(detailUser)?.phoneNumber ?? "-"}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Address</p>
              <p className="mt-1 text-sm text-gray-900">
                {getUserProfile(detailUser)?.address ?? "-"}
              </p>
            </div>

            {detailUser.role === "OCCUPANT" && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 md:col-span-2">
                <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Occupation</p>
                <p className="mt-1 text-sm text-gray-900">
                  {occupationLabel(detailUser.occupantDetails?.occupation)}
                </p>
              </div>
            )}
          </div>
        </CrudModal>
      )}

      {editUser && (
        <CrudModal
          title="Edit User"
          description={
            editUser.role === "ADMIN"
              ? "Update endpoint is available for Operator and Tenant roles."
              : "Perubahan akan disimpan ke endpoint update sesuai role pengguna."
          }
          onClose={() => setEditUserId(null)}
        >
          {editUser.role === "ADMIN" ? (
            <div className="space-y-4">
              {editError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {editError}
                </div>
              ) : null}

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Akun dengan role admin belum memiliki endpoint update khusus di backend.
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Nama</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {getUserProfile(editUser)?.name ?? "System Admin"}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Email</p>
                  <p className="mt-1 text-sm text-gray-900">{editUser.email}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setEditUserId(null)}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                >Close</button>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleEditSubmit}>
              {editError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {editError}
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                    Email
                  </span>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(event) => {
                      setEditForm((previous) => ({
                        ...previous,
                        email: event.target.value,
                      }));
                    }}
                    required
                    className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                    Password Baru
                  </span>
                  <input
                    type="password"
                    value={editForm.password}
                    onChange={(event) => {
                      setEditForm((previous) => ({
                        ...previous,
                        password: event.target.value,
                      }));
                    }}
                    minLength={6}
                    className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    placeholder="Kosongkan jika tidak diubah"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                    Nama
                  </span>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(event) => {
                      setEditForm((previous) => ({
                        ...previous,
                        name: event.target.value,
                      }));
                    }}
                    required
                    className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                    Nomor HP
                  </span>
                  <input
                    type="text"
                    value={editForm.phoneNumber}
                    onChange={(event) => {
                      setEditForm((previous) => ({
                        ...previous,
                        phoneNumber: event.target.value,
                      }));
                    }}
                    required
                    className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Status</span>
                  <select
                    value={editForm.status}
                    onChange={(event) => {
                      setEditForm((previous) => ({
                        ...previous,
                        status: event.target.value as ProfileStatus,
                      }));
                    }}
                    className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="DEACTIVE">Nonaktif</option>
                  </select>
                </label>

                {editUser.role === "OCCUPANT" ? (
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      Occupation
                    </span>
                    <select
                      value={editForm.occupation}
                      onChange={(event) => {
                        setEditForm((previous) => ({
                          ...previous,
                          occupation: event.target.value as OccupantOccupation,
                        }));
                      }}
                      className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    >
                      <option value="BEKERJA">Bekerja</option>
                      <option value="KULIAH">Kuliah</option>
                    </select>
                  </label>
                ) : null}

                <label className="flex flex-col gap-1 md:col-span-2">
                  <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Address</span>
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(event) => {
                      setEditForm((previous) => ({
                        ...previous,
                        address: event.target.value,
                      }));
                    }}
                    required
                    className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditForm(buildEditForm(editUser));
                    setEditError("");
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                >
                  Reset Form
                </button>
                <button
                  type="button"
                  onClick={() => setEditUserId(null)}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                >Close</button>
              </div>
            </form>
          )}
        </CrudModal>
      )}

      {deleteUser && (
        <CrudModal
          title="Delete User"
          description="Pengguna akan dihapus dari sistem. Data transaksi dan invoice tetap tersimpan."
          onClose={() => setDeleteUserId(null)}
          maxWidthClass="max-w-xl"
        >
          <div className="space-y-4">
            {deleteError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {deleteError}
              </div>
            ) : null}

            <p className="text-sm text-gray-700">
              Anda akan menghapus pengguna{" "}
              <span className="font-semibold text-gray-900">
                {getUserProfile(deleteUser)?.name ?? "System Admin"}
              </span>{" "}
              ({deleteUser.email}).
            </p>

            {deleteUser.role === "ADMIN" ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                ⛔ Akun dengan role <strong>Admin</strong> tidak dapat dihapus.
              </div>
            ) : deleteUser.role === "OCCUPANT" ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <p className="font-semibold">Tenant Deletion (Soft Delete)</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs">
                  <li>Tenant will be checked out from room automatically</li>
                  <li>Invoice &amp; riwayat pembayaran <strong>tetap tersimpan</strong></li>
                  <li>Akun tidak dapat login setelah dihapus</li>
                </ul>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <p className="font-semibold">Penghapusan Operator (Soft Delete)</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs">
                  <li>Akun operator tidak dapat login setelah dihapus</li>
                  <li>Data aktivitas operator <strong>tetap tersimpan</strong></li>
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isSubmitting || deleteUser.role === "ADMIN"}
                onClick={() => {
                  void handleDeleteConfirm();
                }}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Deleting..." : "Yes, Delete"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteUserId(null)}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
              >Cancel</button>
            </div>
          </div>
        </CrudModal>
      )}
    </section>
  );
}
