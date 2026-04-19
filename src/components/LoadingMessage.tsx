import { useEffect, useState } from "react";

type Props = {
  label: string;
};

export const LoadingMessage = ({ label }: Props) => {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const id = setInterval(
      () => setDots((d) => (d.length >= 3 ? "." : d + ".")),
      350,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div className="py-16 text-center text-sm text-muted-foreground">
      {label}
      {dots}
    </div>
  );
};
