import { Logo } from "../icons/logo";
import { useTranslation } from "react-i18next";

const PAGE_INTERVAL_MS = 10000;

interface HeaderProps {
    pageKey: number;
    showProgress: boolean;
    currentPage: number;
    totalPages: number;
    title?: string;
    eventName?: string;
}

function LogoIcon() {
    return (
        <Logo width={60} height={60} className="text-black" bgFill="fill-black" itemFill="fill-yellow-400" aria-hidden="true" />
    );
}

export function Header({ pageKey, showProgress, currentPage, totalPages, title, eventName }: HeaderProps) {
    const { t } = useTranslation();
    const finalTitle = title || t("display.ordersReady");
    return (
        <header className="z-10 flex flex-col w-full bg-amber-400 shadow-md border-b-2 border-amber-500">
            <div className="flex items-center justify-between px-6" style={{ minHeight: "72px" }}>
                <div className="flex items-center gap-3">
                    <LogoIcon />
                    <h1 className="text-3xl text-black font-black tracking-tight select-none">
                        {finalTitle}
                        {eventName && (
                            <>
                                <span> - </span>
                                <span>{eventName}</span>
                            </>
                        )}
                    </h1>
                </div>

                {showProgress && (
                    <div className="flex items-center gap-2 bg-black/10 rounded-xl px-5 py-2">
                        <span className="text-black font-black text-2xl select-none tabular-nums leading-none">
                            {currentPage + 1}
                        </span>
                        <span className="text-black/50 font-bold text-base select-none leading-none">
                            /
                        </span>
                        <span className="text-black font-black text-2xl select-none tabular-nums leading-none">
                            {totalPages}
                        </span>
                    </div>
                )}
            </div>

            <div className="h-2.5 w-full bg-black/10">
                {showProgress && (
                    <div
                        key={pageKey}
                        className="h-full bg-black/90 rounded-r-full origin-left"
                        style={{
                            animation: `progress-bar-fill ${PAGE_INTERVAL_MS}ms linear forwards`,
                        }}
                    />
                )}
            </div>
        </header>
    );
}
