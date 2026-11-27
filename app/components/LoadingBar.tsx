interface LoadingBarProps {
    active: boolean;
    label?: string;
}

export function LoadingBar({ active, label }: LoadingBarProps) {
    if (!active) return null;

    return (
        <div>
            <div className="loading-bar">
                <div className="loading-bar-inner" />
            </div>
            {label && <small className="muted">{label}</small>}
        </div>
    );
}
