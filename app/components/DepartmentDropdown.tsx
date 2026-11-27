import { useState } from "react";

export interface DepartmentOption {
    id: number;
    name: string;
}

interface DepartmentDropdownProps {
    name: string;
    departments: DepartmentOption[];
    defaultValue?: number | "";
    error?: string;
}

export function DepartmentDropdown({
    name,
    departments,
    defaultValue = "",
    error,
}: DepartmentDropdownProps) {
    const [keyword, setKeyword] = useState("");
    const [selectedId, setSelectedId] = useState<string>(
        defaultValue ? String(defaultValue) : ""
    );

    const filtered = departments.filter(
        (dept) =>
        dept.name.toLowerCase().includes(keyword.trim().toLowerCase()) ||
        String(dept.id) === selectedId
    );

    return (
        <div>
        <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Filter department..."
            style={{ marginBottom: 4 }}
        />
        <select
            name={name}
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
        >
            <option value="">-- Pilih Department --</option>
            {filtered.map((dept) => (
            <option key={dept.id} value={dept.id}>
                {dept.name} 
            </option>
            ))}
        </select>
        {error && <small className="err">{error}</small>}
        </div>
    );
}