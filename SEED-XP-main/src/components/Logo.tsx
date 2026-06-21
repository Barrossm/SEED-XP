import React from "react";

interface LogoProps {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({
  size = 40,
  withWordmark = false,
  className = "",
}) => {
  // TRUQUE DE MESTRE: Multiplicamos o tamanho vindo do componente pai por 2.5 ou 3.
  // Assim, se o app pedir tamanho 56, sua imagem vai renderizar com 140px de altura!
  const sizeMultiplier = 2.5;
  const finalHeight = size * sizeMultiplier;

  return (
    <div
      className={`inline-flex flex-col items-center justify-center gap-3 ${className}`}
    >
      <img
        src="/logo-seed.png"
        alt="Seed a Bit"
        // Aplicamos a altura final ampliada e deixamos a largura livre para não amassar
        style={{ height: `${finalHeight}px`, width: "auto" }}
        className="object-contain max-w-full"
      />

      {withWordmark && (
        <span className="font-display font-extrabold text-primary text-2xl mt-1 leading-none">
          Seed a Bit
        </span>
      )}
    </div>
  );
};

export default Logo;
