import "./globals.css";
import Link from "next/link";

export const metadata = { title: "PDF Quiz", description: "Turn a PDF of MCQs into a unit-wise quiz for students" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <nav>
          <div className="inner">
            <span className="brand">📝 PDF Quiz</span>
            <Link href="/">🎓 Take Quiz</Link>
            <Link href="/instructor">📄 Instructor</Link>
            <Link href="/dashboard">📊 Dashboard</Link>
          </div>
        </nav>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
