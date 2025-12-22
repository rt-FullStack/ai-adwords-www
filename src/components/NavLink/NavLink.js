import Link from "next/link";
import "@/components/NavLink/NavLink.css";


export default function NavbarLink({ href, text }) {
    return (
        <Link href={href} className="navbar-link">
            <span className="link-text">
                {text}
            </span>
        </Link>
    );
}