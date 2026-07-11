"use client";

const LEFT_DOTS = "left-dots" as const;
const RIGHT_DOTS = "right-dots" as const;

type PageItem = number | typeof LEFT_DOTS | typeof RIGHT_DOTS;

const range = (start: number, end: number): number[] =>
    Array.from({ length: end - start + 1 }, (_, i) => start + i);

function getPageNumbers(
    totalPages: number,
    currentPage: number,
    siblingCount: number = 1
): PageItem[] {
    if (totalPages <= 0) return [];

    const totalVisibleNumbers = siblingCount * 2 + 5;

    if (totalPages <= totalVisibleNumbers) {
        return range(1, totalPages);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

    const firstPage = 1;
    const lastPage = totalPages;

    if (!shouldShowLeftDots && shouldShowRightDots) {
        const leftItemCount = 3 + siblingCount * 2;
        return [...range(1, leftItemCount), RIGHT_DOTS, lastPage];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
        const rightItemCount = 3 + siblingCount * 2;
        return [firstPage, LEFT_DOTS, ...range(totalPages - rightItemCount + 1, totalPages)];
    }

    return [
        firstPage,
        LEFT_DOTS,
        ...range(leftSiblingIndex, rightSiblingIndex),
        RIGHT_DOTS,
        lastPage,
    ];
}

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
    if (totalPages <= 1) return null;

    const pages = getPageNumbers(totalPages, currentPage, 1);

    return (
        <div className="pagination-wrapper" role="navigation" aria-label="ترقيم الصفحات">
            {/* RTL: chevron-right = previous (visually points toward start) */}
            <button
                className="page-btn"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="الصفحة السابقة"
            >
                <i className="fa-solid fa-chevron-right" />
            </button>

            {pages.map((page) =>
                typeof page === "number" ? (
                    <button
                        key={page}
                        className={`page-btn ${currentPage === page ? "active" : ""}`}
                        onClick={() => onPageChange(page)}
                        aria-current={currentPage === page ? "page" : undefined}
                    >
                        {page}
                    </button>
                ) : (
                    <span key={page} className="page-btn dots" aria-hidden="true">
                        &#8230;
                    </span>
                )
            )}

            {/* RTL: chevron-left = next */}
            <button
                className="page-btn"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                aria-label="الصفحة التالية"
            >
                <i className="fa-solid fa-chevron-left" />
            </button>
        </div>
    );
}