import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import apiClient from "../../services/apiClient";
import Pagination from "../../components/common/Pagination";
import { TableActionMenu, TabBar, StatusBadge } from "../../components/ui";

export default function TopologyManagement() {
  // Tab chế độ xem: 'all' (Tất cả cây phân cấp), 'branches' (Cơ sở), 'departments' (Khoa), 'rooms' (Phòng khám)
  const [activeTab, setActiveTab] = useState("all");

  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination cho các tab phẳng
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Trạng thái đóng/mở nhánh cây phân cấp (Cơ sở & Khoa)
  const [expandedBranches, setExpandedBranches] = useState(new Set());
  const [expandedDepts, setExpandedDepts] = useState(new Set());

  // Tìm kiếm nhanh trong cây phân cấp
  const [searchQuery, setSearchQuery] = useState("");

  // Kebab menu hành động thao tác (row action dropdown)
  const [activeMenuId, setActiveMenuId] = useState(null);
  const menuRef = useRef(null);

  // Modal tạo mới đơn vị
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState("branch"); // 'branch' | 'department' | 'room'
  const [createItem, setCreateItem] = useState({
    name: "",
    detail: "",
    phone: "02432237777",
    branchId: "",
    departmentId: "",
    lockedParent: false,
    parentName: "",
  });

  // Modal chỉnh sửa đơn vị
  const [showEditModal, setShowEditModal] = useState(false);
  const [editType, setEditType] = useState("branch");
  const [editItem, setEditItem] = useState({
    id: null,
    name: "",
    detail: "",
    phone: "",
    branchId: "",
    departmentId: "",
  });

  // Tải dữ liệu toàn bộ cấu trúc hạ tầng y tế
  const loadTopology = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, dRes, rRes] = await Promise.all([
        apiClient.get("/branches"),
        apiClient.get("/departments"),
        apiClient.get("/rooms"),
      ]);
      const brList = bRes.data || [];
      const dpList = dRes.data || [];
      const rmList = rRes.data || [];
      setBranches(brList);
      setDepartments(dpList);
      setRooms(rmList);

      // Mặc định mở rộng tất cả cơ sở và khoa để thấy rõ toàn bộ cây phân cấp
      setExpandedBranches(new Set(brList.map((b) => String(b.id))));
      setExpandedDepts(new Set(dpList.map((d) => String(d.id))));
    } catch {
      // Handled by apiClient
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTopology();
  }, [loadTopology]);

  // Đóng dropdown thao tác khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Điều khiển đóng/mở nhánh cây
  const toggleBranch = (branchId) => {
    const key = String(branchId);
    setExpandedBranches((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleDept = (deptId) => {
    const key = String(deptId);
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Mở modal thêm Cơ Sở mới (Cấp 1)
  const openAddBranchModal = () => {
    setCreateType("branch");
    setCreateItem({
      name: "",
      detail: "",
      phone: "02432237777",
      branchId: "",
      departmentId: "",
      lockedParent: false,
      parentName: "",
    });
    setShowCreateModal(true);
  };

  // Mở modal thêm Khoa mới (Cấp 2)
  const openAddDeptModal = (targetBranch = null) => {
    const parentB = targetBranch || branches[0];
    setCreateType("department");
    setCreateItem({
      name: "",
      detail: "",
      phone: "",
      branchId: parentB ? String(parentB.id) : "",
      departmentId: "",
      lockedParent: Boolean(targetBranch),
      parentName: parentB ? parentB.name : "",
    });
    setShowCreateModal(true);
    setActiveMenuId(null);
  };

  // Mở modal thêm Phòng khám mới (Cấp 3)
  const openAddRoomModal = (targetDept = null) => {
    const parentD = targetDept || departments[0];
    setCreateType("room");
    setCreateItem({
      name: "",
      detail: "",
      phone: "",
      branchId: "",
      departmentId: parentD ? String(parentD.id) : "",
      lockedParent: Boolean(targetDept),
      parentName: parentD ? parentD.name : "",
    });
    setShowCreateModal(true);
    setActiveMenuId(null);
  };

  // Mở modal chỉnh sửa
  const openEditModal = (type, item) => {
    setEditType(type);
    if (type === "branch") {
      setEditItem({
        id: item.id,
        name: item.name || "",
        detail: item.address || "",
        phone: item.phone || "",
        branchId: "",
        departmentId: "",
      });
    } else if (type === "department") {
      setEditItem({
        id: item.id,
        name: item.name || "",
        detail: item.description || "",
        phone: "",
        branchId: String(item.branch_id || ""),
        departmentId: "",
      });
    } else {
      setEditItem({
        id: item.id,
        name: item.name || "",
        detail: item.description || "",
        phone: "",
        branchId: "",
        departmentId: String(item.department_id || ""),
      });
    }
    setShowEditModal(true);
    setActiveMenuId(null);
  };

  // Xử lý tạo mới đơn vị
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createItem.name.trim()) {
      toast.error("Vui lòng nhập tên đơn vị!");
      return;
    }

    try {
      if (createType === "branch") {
        const res = await apiClient.post("/branches", {
          name: createItem.name.trim(),
          address: createItem.detail.trim() || "Hà Nội",
          phone: createItem.phone.replace(/\s+/g, "").trim() || "02432237777",
        });
        const newBranchId = res.data?.id;
        toast.success(`Đã thêm cơ sở bệnh viện mới: ${createItem.name.trim()}`);
        setShowCreateModal(false);
        await loadTopology();
        if (newBranchId) {
          setExpandedBranches((prev) => new Set(prev).add(String(newBranchId)));
        }
      } else if (createType === "department") {
        const bId = Number(createItem.branchId || branches[0]?.id || 1);
        const res = await apiClient.post("/departments", {
          name: createItem.name.trim(),
          description: createItem.detail.trim() || "Chuyên khoa lâm sàng",
          branch_id: bId,
        });
        const newDeptId = res.data?.id;
        toast.success(`Đã thêm khoa mới vào cơ sở!`);
        setShowCreateModal(false);
        await loadTopology();
        setExpandedBranches((prev) => new Set(prev).add(String(bId)));
        if (newDeptId) {
          setExpandedDepts((prev) => new Set(prev).add(String(newDeptId)));
        }
      } else {
        const dId = Number(createItem.departmentId || departments[0]?.id || 1);
        await apiClient.post("/rooms", {
          name: createItem.name.trim(),
          description: createItem.detail.trim() || "Phòng khám chuyên khoa",
          department_id: dId,
        });
        toast.success(`Đã thêm phòng khám mới vào khoa!`);
        setShowCreateModal(false);
        await loadTopology();
        setExpandedDepts((prev) => new Set(prev).add(String(dId)));
      }
    } catch {
      // Handled by apiClient
    }
  };

  // Xử lý cập nhật thông tin đơn vị
  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editItem.name.trim()) {
      toast.error("Vui lòng nhập tên đơn vị!");
      return;
    }

    try {
      if (editType === "branch") {
        await apiClient.put(`/branches/${editItem.id}`, {
          name: editItem.name.trim(),
          address: editItem.detail.trim() || "Hà Nội",
          phone: editItem.phone.replace(/\s+/g, "").trim() || "02432237777",
        });
        toast.success(`Đã cập nhật cơ sở "${editItem.name.trim()}"`);
      } else if (editType === "department") {
        await apiClient.put(`/departments/${editItem.id}`, {
          name: editItem.name.trim(),
          description: editItem.detail.trim() || "Chuyên khoa lâm sàng",
          branch_id: Number(editItem.branchId || 1),
        });
        toast.success(`Đã cập nhật khoa "${editItem.name.trim()}"`);
      } else {
        await apiClient.put(`/rooms/${editItem.id}`, {
          name: editItem.name.trim(),
          description: editItem.detail.trim() || "Phòng khám chuyên khoa",
          department_id: Number(editItem.departmentId || 1),
        });
        toast.success(`Đã cập nhật phòng "${editItem.name.trim()}"`);
      }
      setShowEditModal(false);
      await loadTopology();
    } catch {
      // Handled by apiClient
    }
  };

  // Xóa đơn vị
  const handleDelete = async (type, item) => {
    const typeLabel =
      type === "branches" ? "cơ sở" : type === "departments" ? "khoa" : "phòng khám";
    if (!window.confirm(`Xác nhận xóa ${typeLabel} "${item.name}"?`)) return;
    try {
      await apiClient.delete(`/${type}/${item.id}`);
      toast.success(`Đã xóa ${item.name}`);
      setActiveMenuId(null);
      await loadTopology();
    } catch {
      // Handled by apiClient
    }
  };

  // Tra cứu tên cơ sở và khoa
  const getBranchName = (bId) =>
    branches.find((b) => Number(b.id) === Number(bId))?.name || `Cơ sở #${bId}`;
  const getDeptName = (dId) =>
    dId
      ? departments.find((d) => Number(d.id) === Number(dId))?.name || `Khoa #${dId}`
      : "Chưa phân khoa";

  // Tạo danh sách phẳng phân cấp hiển thị dạng cây liền mạch trong Bảng
  const treeRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const rows = [];

    branches.forEach((branch, bIdx) => {
      const isBranchLast = bIdx === branches.length - 1;
      const branchDepts = departments.filter((d) => Number(d.branch_id) === Number(branch.id));
      const isBranchExpanded = expandedBranches.has(String(branch.id));

      // Điều kiện lọc tìm kiếm
      const matchBranch =
        !query ||
        branch.name.toLowerCase().includes(query) ||
        (branch.address && branch.address.toLowerCase().includes(query)) ||
        `cs-${branch.id}`.toLowerCase().includes(query) ||
        `cs-${String(branch.id).padStart(3, "0")}`.toLowerCase().includes(query);

      const matchingDepts = branchDepts.filter((dept) => {
        const deptRooms = rooms.filter((r) => Number(r.department_id) === Number(dept.id));
        const matchDept =
          !query ||
          dept.name.toLowerCase().includes(query) ||
          (dept.description && dept.description.toLowerCase().includes(query)) ||
          `kh-${dept.id}`.toLowerCase().includes(query) ||
          `kh-${String(dept.id).padStart(3, "0")}`.toLowerCase().includes(query);
        const matchRoom = deptRooms.some(
          (r) =>
            !query ||
            r.name.toLowerCase().includes(query) ||
            (r.description && r.description.toLowerCase().includes(query)) ||
            `pk-${r.id}`.toLowerCase().includes(query) ||
            `pk-${String(r.id).padStart(3, "0")}`.toLowerCase().includes(query)
        );
        return matchDept || matchRoom;
      });

      if (!query || matchBranch || matchingDepts.length > 0) {
        // Hàng Cấp 1: Cơ sở (Branch)
        rows.push({
          id: `branch-${branch.id}`,
          type: "branch",
          item: branch,
          level: 0,
          code: `CS-${String(branch.id).padStart(3, "0")}`,
          badge: `CS-${branch.id}`,
          name: branch.name,
          address: branch.address || "99 Phố Y Học, Hà Nội",
          phone: branch.phone || "02432237777",
          status: String(branch.is_active ?? "1") !== "0" && branch.is_active !== false ? "Hoạt động" : "Tạm dừng",
          isExpanded: isBranchExpanded,
          hasChildren: branchDepts.length > 0,
          childCount: branchDepts.length,
          isLastInParent: isBranchLast,
        });

        // Nếu mở rộng cơ sở hoặc đang tìm kiếm
        if (isBranchExpanded || query) {
          const deptsToRender = query ? matchingDepts : branchDepts;

          deptsToRender.forEach((dept, dIdx) => {
            const isDeptLast = dIdx === deptsToRender.length - 1;
            const deptRooms = rooms.filter((r) => Number(r.department_id) === Number(dept.id));
            const isDeptExpanded = expandedDepts.has(String(dept.id));

            const matchingRooms = deptRooms.filter(
              (r) =>
                !query ||
                r.name.toLowerCase().includes(query) ||
                (r.description && r.description.toLowerCase().includes(query)) ||
                `pk-${r.id}`.toLowerCase().includes(query) ||
                `pk-${String(r.id).padStart(3, "0")}`.toLowerCase().includes(query)
            );

            // Hàng Cấp 2: Khoa (Department)
            rows.push({
              id: `dept-${dept.id}`,
              type: "department",
              item: dept,
              branch: branch,
              level: 1,
              code: `KH-${String(dept.id).padStart(3, "0")}`,
              badge: `KH-${dept.id}`,
              name: dept.name,
              address: dept.description || "Khu Chuyên Khoa Lâm Sàng",
              status: "Hoạt động",
              isExpanded: isDeptExpanded,
              isLastInParent: isDeptLast,
              hasChildren: deptRooms.length > 0,
              childCount: deptRooms.length,
            });

            // Nếu mở rộng khoa hoặc đang tìm kiếm
            if (isDeptExpanded || query) {
              const roomsToRender = query ? matchingRooms : deptRooms;
              roomsToRender.forEach((room, rIdx) => {
                const isRoomLast = rIdx === roomsToRender.length - 1;
                // Hàng Cấp 3: Phòng khám (Room)
                rows.push({
                  id: `room-${room.id}`,
                  type: "room",
                  item: room,
                  dept: dept,
                  branch: branch,
                  level: 2,
                  code: `PK-${String(room.id).padStart(3, "0")}`,
                  badge: `PK-${room.id}`,
                  name: room.name,
                  roomDetail: room.description || "Phòng khám lâm sàng",
                  address: room.description || "Phòng khám lâm sàng",
                  status: "Hoạt động",
                  isParentLast: isDeptLast,
                  isLastInParent: isRoomLast,
                });
              });
            }
          });
        }
      }
    });

    return rows;
  }, [branches, departments, rooms, expandedBranches, expandedDepts, searchQuery]);

  // Danh sách phẳng cho từng tab riêng lẻ
  const flatBranches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return branches.filter((b) => !q || b.name.toLowerCase().includes(q) || (b.address && b.address.toLowerCase().includes(q)));
  }, [branches, searchQuery]);

  const flatDepartments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return departments.filter((d) => !q || d.name.toLowerCase().includes(q) || (d.description && d.description.toLowerCase().includes(q)));
  }, [departments, searchQuery]);

  const flatRooms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rooms.filter((r) => !q || r.name.toLowerCase().includes(q) || (r.description && r.description.toLowerCase().includes(q)));
  }, [rooms, searchQuery]);

  const paginatedBranches = flatBranches.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const paginatedDepts = flatDepartments.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const paginatedRooms = flatRooms.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      {/* 1. Hero Banner (Chuẩn Design System đồng bộ Admin & Doctor) */}
      <div className="base-hero">
        <div className="base-hero-content">
          <div>
            <h1 className="base-hero-title">Hạ tầng cơ sở y tế</h1>
          </div>
          <div className="base-hero-actions">
            <button
              type="button"
              onClick={openAddBranchModal}
              className="base-btn-hero-accent cursor-pointer"
            >
              <span className="isax icon-add text-sm"></span>
              <span>Thêm cơ sở</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Thanh Tabs & Ô Tìm Kiếm */}
      <div className="bg-white p-4 rounded-lg border border-[var(--base-border-opaque)] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <TabBar
          tabs={[
            { id: "all", label: "Tất cả", icon: "buildings", badge: branches.length },
            { id: "branches", label: "Cơ sở", icon: "hospital", badge: branches.length },
            { id: "departments", label: "Khoa", icon: "health", badge: departments.length },
            { id: "rooms", label: "Phòng khám", icon: "element-plus", badge: rooms.length },
          ]}
          activeTab={activeTab}
          onChange={(tabId) => {
            setActiveTab(tabId);
            setCurrentPage(1);
          }}
          variant="underline"
        />

        {/* Ô Tìm kiếm */}
        <div className="relative w-full lg:w-72">
          <span className="isax icon-search-normal-1 text-xs text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"></span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm theo tên, mã, địa chỉ..."
            style={{ paddingLeft: 36 }}
            className="base-input !pl-9 pr-8 text-xs w-full"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
              aria-label="Xóa tìm kiếm"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 3. Bảng Dữ Liệu */}
      {loading ? (
        <div className="base-card p-12 text-center text-xs text-gray-400 rounded-lg">
          Đang tải dữ liệu cấu trúc hạ tầng cơ sở y tế...
        </div>
      ) : activeTab === "all" ? (
        /* ================= BẢNG CÂY PHÂN CẤP TỔNG HỢP ================= */
        <div className="base-card rounded-lg overflow-hidden">
          <div className="overflow-x-auto base-table-container">
            <table className="base-table w-full">
              <thead>
                <tr>
                  <th className="w-[40%] whitespace-nowrap">Tên đơn vị</th>
                  <th className="whitespace-nowrap">Mã định danh</th>
                  <th className="hidden md:table-cell whitespace-nowrap">Địa chỉ</th>
                  <th className="whitespace-nowrap">Trạng thái</th>
                  <th className="text-right whitespace-nowrap sticky-action-col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {treeRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-xs text-gray-400">
                      Không tìm thấy cơ sở, khoa hay phòng khám nào khớp với từ khóa tìm kiếm.
                    </td>
                  </tr>
                ) : (
                  treeRows.map((row) => {
                    if (row.type === "branch") {
                      // --- CẤP 1: CƠ SỞ ---
                      return (
                        <tr key={row.id} className="hover:bg-blue-50/25 transition-colors group">
                          <td>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleBranch(row.item.id)}
                                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-900 cursor-pointer shrink-0 transition-colors"
                                title={row.isExpanded ? "Thu gọn danh sách khoa" : "Mở rộng danh sách khoa"}
                              >
                                <span
                                  className={`isax ${
                                    row.isExpanded ? "icon-arrow-down-1" : "icon-arrow-right-3"
                                  } text-sm font-bold`}
                                ></span>
                              </button>

                              <div className="w-7 h-7 rounded bg-blue-50 text-[#091F5B] flex items-center justify-center shrink-0">
                                <span className="isax-b icon-buildings text-base"></span>
                              </div>

                              <span className="base-tag base-tag-info font-mono font-bold text-xs shrink-0">
                                {row.badge}
                              </span>

                              <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                                  {row.name}
                                </p>
                                {row.address && (
                                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                                    <span className="isax icon-location text-xs text-gray-400"></span>
                                    <span>{row.address}</span>
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="font-mono text-xs font-semibold text-gray-600 whitespace-nowrap">
                            {row.code}
                          </td>

                          <td className="hidden md:table-cell text-xs text-gray-600 truncate max-w-[220px]">
                            {row.address}
                          </td>

                          <td className="whitespace-nowrap">
                            <StatusBadge variant="active" label={row.status} dot />
                          </td>

                          <td className="text-right whitespace-nowrap sticky-action-col">
                            <TableActionMenu
                              items={[
                                {
                                  label: "Thêm khoa trực thuộc",
                                  icon: "add",
                                  onClick: () => openAddDeptModal(row.item),
                                },
                                {
                                  label: "Chỉnh sửa cơ sở",
                                  icon: "edit-2",
                                  onClick: () => openEditModal("branch", row.item),
                                },
                                { divider: true },
                                {
                                  label: "Xóa cơ sở này",
                                  icon: "trash",
                                  variant: "destructive",
                                  onClick: () => handleDelete("branches", row.item),
                                },
                              ]}
                            />
                          </td>
                        </tr>
                      );
                    }

                    if (row.type === "department") {
                      // --- CẤP 2: KHOA ---
                      return (
                        <tr key={row.id} className="hover:bg-indigo-50/20 transition-colors group">
                          <td>
                            <div className="flex items-center gap-1.5">
                              <div className="flex items-center shrink-0 w-8 h-10 relative mr-1 self-stretch">
                                <div
                                  className="absolute left-3 top-0 w-px bg-gray-300"
                                  style={{ height: row.isLastInParent ? "50%" : "100%" }}
                                />
                                <div className="absolute left-3 top-1/2 w-4 h-px bg-gray-300" />
                              </div>

                              <button
                                type="button"
                                onClick={() => toggleDept(row.item.id)}
                                className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-800 cursor-pointer shrink-0 transition-colors"
                                title={row.isExpanded ? "Thu gọn phòng khám" : "Xem phòng khám của khoa"}
                              >
                                <span
                                  className={`isax ${
                                    row.isExpanded ? "icon-arrow-down-1" : "icon-arrow-right-3"
                                  } text-xs font-bold`}
                                ></span>
                              </button>

                              <div className="w-6 h-6 rounded bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                                <span className="isax icon-health text-sm"></span>
                              </div>

                              <span className="base-tag base-tag-info font-mono font-bold text-xs shrink-0">
                                {row.badge}
                              </span>

                              <span className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                                {row.name}
                              </span>
                            </div>
                          </td>

                          <td className="font-mono text-xs font-semibold text-gray-600 whitespace-nowrap">
                            {row.code}
                          </td>

                          <td className="hidden md:table-cell text-xs text-gray-600 truncate max-w-[220px]">
                            {row.address}
                          </td>

                          <td className="whitespace-nowrap">
                            <StatusBadge variant="active" label={row.status} dot />
                          </td>

                          <td className="text-right whitespace-nowrap sticky-action-col">
                            <TableActionMenu
                              items={[
                                {
                                  label: "Thêm phòng khám",
                                  icon: "add",
                                  onClick: () => openAddRoomModal(row.item),
                                },
                                {
                                  label: "Chỉnh sửa khoa",
                                  icon: "edit-2",
                                  onClick: () => openEditModal("department", row.item),
                                },
                                { divider: true },
                                {
                                  label: "Xóa khoa này",
                                  icon: "trash",
                                  variant: "destructive",
                                  onClick: () => handleDelete("departments", row.item),
                                },
                              ]}
                            />
                          </td>
                        </tr>
                      );
                    }

                    // --- CẤP 3: PHÒNG KHÁM ---
                    return (
                      <tr key={row.id} className="hover:bg-emerald-50/20 transition-colors group">
                        <td>
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center shrink-0 w-16 h-10 relative mr-1 self-stretch">
                              {!row.isParentLast && (
                                <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-300" />
                              )}
                              <div
                                className="absolute left-10 top-0 w-px bg-gray-300"
                                style={{ height: row.isLastInParent ? "50%" : "100%" }}
                              />
                              <div className="absolute left-10 top-1/2 w-4 h-px bg-gray-300" />
                            </div>

                            <span className="base-tag base-tag-info font-mono font-bold text-xs shrink-0">
                              {row.badge}
                            </span>

                            <div className="min-w-0">
                              <span className="text-xs sm:text-sm font-medium text-gray-900 truncate block">
                                {row.name}
                              </span>
                              {row.roomDetail && (
                                <span className="text-xs text-gray-400 block font-mono">
                                  {row.roomDetail}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="font-mono text-xs font-semibold text-gray-600 whitespace-nowrap">
                          {row.code}
                        </td>

                        <td className="hidden md:table-cell text-xs text-gray-600 truncate max-w-[220px]">
                          {row.address}
                        </td>

                        <td className="whitespace-nowrap">
                          <StatusBadge variant="active" label={row.status} dot />
                        </td>

                        <td className="text-right whitespace-nowrap sticky-action-col">
                          <TableActionMenu
                            items={[
                              {
                                label: "Chỉnh sửa phòng",
                                icon: "edit-2",
                                onClick: () => openEditModal("room", row.item),
                              },
                              { divider: true },
                              {
                                label: "Xóa phòng này",
                                icon: "trash",
                                variant: "destructive",
                                onClick: () => handleDelete("rooms", row.item),
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === "branches" ? (
        /* ================= TAB BẢNG CƠ SỞ (FLAT) ================= */
        <div className="base-card rounded-lg overflow-hidden">
          <div className="overflow-x-auto base-table-container">
            <table className="base-table w-full">
              <thead>
                <tr>
                  <th className="whitespace-nowrap">Mã cơ sở</th>
                  <th className="whitespace-nowrap">Tên cơ sở bệnh viện</th>
                  <th className="hidden md:table-cell whitespace-nowrap">Địa chỉ trụ sở</th>
                  <th className="hidden lg:table-cell whitespace-nowrap">Hotline liên hệ</th>
                  <th className="whitespace-nowrap">Trạng thái</th>
                  <th className="text-right whitespace-nowrap sticky-action-col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBranches.map((b) => (
                  <tr key={b.id}>
                    <td className="font-mono font-bold text-xs text-[var(--base-brand-navy)] whitespace-nowrap">
                      CS-{String(b.id).padStart(3, "0")}
                    </td>
                    <td className="font-bold text-xs sm:text-sm text-gray-900">{b.name}</td>
                    <td className="hidden md:table-cell text-xs text-gray-600">{b.address || "Hà Nội"}</td>
                    <td className="hidden lg:table-cell text-xs font-mono text-gray-600 whitespace-nowrap">{b.phone}</td>
                    <td className="whitespace-nowrap">
                      <StatusBadge variant="active" label="Hoạt động" dot />
                    </td>
                    <td className="text-right whitespace-nowrap sticky-action-col">
                      <TableActionMenu
                        items={[
                          {
                            label: "Thêm khoa chuyên môn",
                            icon: "add",
                            onClick: () => openAddDeptModal(b),
                          },
                          {
                            label: "Chỉnh sửa cơ sở",
                            icon: "edit-2",
                            onClick: () => openEditModal("branch", b),
                          },
                          { divider: true },
                          {
                            label: "Xóa cơ sở",
                            icon: "trash",
                            variant: "destructive",
                            onClick: () => handleDelete("branches", b),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(flatBranches.length / pageSize) || 1}
            onPageChange={setCurrentPage}
          />
        </div>
      ) : activeTab === "departments" ? (
        /* ================= TAB BẢNG KHOA (FLAT) ================= */
        <div className="base-card rounded-lg overflow-hidden">
          <div className="overflow-x-auto base-table-container">
            <table className="base-table w-full">
              <thead>
                <tr>
                  <th className="whitespace-nowrap">Mã khoa</th>
                  <th className="whitespace-nowrap">Tên khoa chuyên môn</th>
                  <th className="hidden md:table-cell whitespace-nowrap">Trực thuộc cơ sở</th>
                  <th className="hidden lg:table-cell whitespace-nowrap">Mô tả lâm sàng</th>
                  <th className="whitespace-nowrap">Trạng thái</th>
                  <th className="text-right whitespace-nowrap sticky-action-col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDepts.map((d) => (
                  <tr key={d.id}>
                    <td className="font-mono font-bold text-xs text-[var(--base-brand-navy)] whitespace-nowrap">
                      KH-{String(d.id).padStart(3, "0")}
                    </td>
                    <td className="font-bold text-xs sm:text-sm text-gray-900">{d.name}</td>
                    <td className="hidden md:table-cell text-xs font-semibold text-gray-700">
                      {getBranchName(d.branch_id)}
                    </td>
                    <td className="hidden lg:table-cell text-xs text-gray-600">
                      {d.description || "Chuyên khoa lâm sàng"}
                    </td>
                    <td className="whitespace-nowrap">
                      <StatusBadge variant="active" label="Hoạt động" dot />
                    </td>
                    <td className="text-right whitespace-nowrap sticky-action-col">
                      <TableActionMenu
                        items={[
                          {
                            label: "Thêm phòng khám",
                            icon: "add",
                            onClick: () => openAddRoomModal(d),
                          },
                          {
                            label: "Chỉnh sửa khoa",
                            icon: "edit-2",
                            onClick: () => openEditModal("department", d),
                          },
                          { divider: true },
                          {
                            label: "Xóa khoa",
                            icon: "trash",
                            variant: "destructive",
                            onClick: () => handleDelete("departments", d),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(flatDepartments.length / pageSize) || 1}
            onPageChange={setCurrentPage}
          />
        </div>
      ) : (
        /* ================= TAB BẢNG PHÒNG KHÁM (FLAT) ================= */
        <div className="base-card rounded-lg overflow-hidden">
          <div className="overflow-x-auto base-table-container">
            <table className="base-table w-full">
              <thead>
                <tr>
                  <th className="whitespace-nowrap">Mã phòng</th>
                  <th className="whitespace-nowrap">Tên phòng khám / Chức năng</th>
                  <th className="hidden md:table-cell whitespace-nowrap">Vị trí phòng</th>
                  <th className="hidden lg:table-cell whitespace-nowrap">Khoa phụ trách</th>
                  <th className="whitespace-nowrap">Trạng thái</th>
                  <th className="text-right whitespace-nowrap sticky-action-col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRooms.map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono font-bold text-xs text-[var(--base-brand-navy)] whitespace-nowrap">
                      PK-{String(r.id).padStart(3, "0")}
                    </td>
                    <td className="font-bold text-xs sm:text-sm text-gray-900">{r.name}</td>
                    <td className="hidden md:table-cell text-xs font-mono text-gray-600">
                      {r.description || "Phòng khám lâm sàng"}
                    </td>
                    <td className="hidden lg:table-cell text-xs font-semibold text-gray-700">
                      {getDeptName(r.department_id)}
                    </td>
                    <td className="whitespace-nowrap">
                      <StatusBadge variant="active" label="Hoạt động" dot />
                    </td>
                    <td className="text-right whitespace-nowrap sticky-action-col">
                      <TableActionMenu
                        items={[
                          {
                            label: "Chỉnh sửa phòng",
                            icon: "edit-2",
                            onClick: () => openEditModal("room", r),
                          },
                          { divider: true },
                          {
                            label: "Xóa phòng khám",
                            icon: "trash",
                            variant: "destructive",
                            onClick: () => handleDelete("rooms", r),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(flatRooms.length / pageSize) || 1}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* 4. MODAL TẠO MỚI (Cơ sở / Khoa / Phòng khám) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">
                {createType === "branch"
                  ? "Khởi tạo cơ sở bệnh viện mới"
                  : createType === "department"
                  ? "Thêm khoa chuyên môn mới"
                  : "Thêm phòng khám mới"}
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  {createType === "branch"
                    ? "Tên cơ sở bệnh viện *"
                    : createType === "department"
                    ? "Tên khoa chuyên môn *"
                    : "Tên phòng khám / Chức năng *"}
                </label>
                <input
                  type="text"
                  required
                  value={createItem.name}
                  onChange={(e) => setCreateItem({ ...createItem, name: e.target.value })}
                  placeholder={
                    createType === "branch"
                      ? "VD: Bệnh viện Da liễu Trung ương - Cơ sở 2"
                      : createType === "department"
                      ? "VD: Khoa Dị Ứng & Miễn Dịch Lâm Sàng"
                      : "VD: Phòng Khám Tiếp Đón Ban Đầu"
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#155DFC]"
                />
              </div>

              {createType === "branch" && (
                <>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Địa chỉ trụ sở</label>
                    <input
                      type="text"
                      value={createItem.detail}
                      onChange={(e) => setCreateItem({ ...createItem, detail: e.target.value })}
                      placeholder="VD: 99 Phố Y Học, Hà Nội"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#155DFC]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Hotline cơ sở</label>
                    <input
                      type="text"
                      value={createItem.phone}
                      onChange={(e) => setCreateItem({ ...createItem, phone: e.target.value })}
                      placeholder="02432237777"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#155DFC]"
                    />
                  </div>
                </>
              )}

              {createType === "department" && (
                <>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Cơ sở trực thuộc *</label>
                    <select
                      value={createItem.branchId}
                      disabled={createItem.lockedParent}
                      onChange={(e) => setCreateItem({ ...createItem, branchId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#155DFC] bg-white"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          CS-{b.id}: {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Mô tả chuyên môn</label>
                    <textarea
                      rows={2}
                      value={createItem.detail}
                      onChange={(e) => setCreateItem({ ...createItem, detail: e.target.value })}
                      placeholder="Mô tả chức năng khám và điều trị mày đay..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#155DFC]"
                    />
                  </div>
                </>
              )}

              {createType === "room" && (
                <>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Khoa phụ trách *</label>
                    <select
                      value={createItem.departmentId}
                      disabled={createItem.lockedParent}
                      onChange={(e) => setCreateItem({ ...createItem, departmentId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#155DFC] bg-white"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          KH-{d.id}: {d.name} ({getBranchName(d.branch_id)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Vị trí / Số phòng</label>
                    <input
                      type="text"
                      value={createItem.detail}
                      onChange={(e) => setCreateItem({ ...createItem, detail: e.target.value })}
                      placeholder="VD: Phòng 301 - Tầng 3 Tòa nhà A"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#155DFC]"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="base-btn base-btn-secondary base-btn-compact cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="base-btn base-btn-primary base-btn-compact cursor-pointer"
                >
                  Lưu đơn vị
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL CHỈNH SỬA (Cơ sở / Khoa / Phòng khám) */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">
                Chỉnh sửa {editType === "branch" ? "cơ sở" : editType === "department" ? "khoa" : "phòng khám"}
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Tên đơn vị *</label>
                <input
                  type="text"
                  required
                  value={editItem.name}
                  onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#155DFC]"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  {editType === "branch" ? "Địa chỉ trụ sở" : "Mô tả / Vị trí"}
                </label>
                <input
                  type="text"
                  value={editItem.detail}
                  onChange={(e) => setEditItem({ ...editItem, detail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#155DFC]"
                />
              </div>

              {editType === "branch" && (
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Hotline</label>
                  <input
                    type="text"
                    value={editItem.phone}
                    onChange={(e) => setEditItem({ ...editItem, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#155DFC]"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="base-btn base-btn-secondary base-btn-compact cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="base-btn base-btn-primary base-btn-compact cursor-pointer"
                >
                  Cập nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
