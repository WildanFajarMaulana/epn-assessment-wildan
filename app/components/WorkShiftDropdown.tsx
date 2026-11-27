import { useState } from "react";

export interface WorkShiftOption {
    id: number;
    name: string;
}

interface WorkShiftDropdownProps {
    name: string;
    workShifts: WorkShiftOption[];
    defaultValue?: number | "";
    error?: string;
}

export function WorkShiftDropdown({
    name,
    workShifts,
    defaultValue = "",
    error,
}: WorkShiftDropdownProps) {
    const [keyword, setKeyword] = useState("");
    const [selectedId, setSelectedId] = useState<string>(
        defaultValue ? String(defaultValue) : ""
    );

    const filtered = workShifts.filter(
        (shift) =>
        shift.name.toLowerCase().includes(keyword.trim().toLowerCase()) ||
        String(shift.id) === selectedId
    );

    return (
        <div>
        <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Filter shift kerja..."
            style={{ marginBottom: 4 }}
        />
        <select
            name={name}
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
        >
            <option value="">-- Pilih Shift Kerja --</option>
            {filtered.map((shift) => (
            <option key={shift.id} value={shift.id}>
                {shift.name}
            </option>
            ))}
        </select>
        {error && <small className="err">{error}</small>}
        </div>
    );
}
