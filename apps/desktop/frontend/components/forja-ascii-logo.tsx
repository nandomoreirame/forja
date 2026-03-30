const ASCII_LOGO = `███████╗ ██████╗ ██████╗      ██╗ █████╗
██╔════╝██╔═══██╗██╔══██╗     ██║██╔══██╗
█████╗  ██║   ██║██████╔╝     ██║███████║
██╔══╝  ██║   ██║██╔══██╗██   ██║██╔══██║
██║     ╚██████╔╝██║  ██║╚█████╔╝██║  ██║
╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚════╝ ╚═╝  ╚═╝`;

export function ForjaAsciiLogo() {
  return (
    <pre className="select-none font-mono text-[10px] leading-tight text-brand">
      {ASCII_LOGO}
    </pre>
  );
}
