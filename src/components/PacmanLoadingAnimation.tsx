import React from 'react';

export default function PacmanLoadingAnimation() {
  return (
    <div className="flex items-center justify-center my-1 h-10 w-[140px] overflow-hidden select-none relative mx-auto">
      <style>{`
        .pacman-scene {
          position: absolute;
          top: 0;
          left: 0;
          width: 280px;  /* Largura reduzida para a nova escala menor */
          height: 80px;  /* Altura reduzida */
          transform: scale(0.5);
          transform-origin: left top;
          --pacman-color: #000080;
          --pacman-text-color: #000080;
        }

        /* Seletor robusto para tema escuro */
        .dark .pacman-scene,
        [class*="dark"] .pacman-scene {
          --pacman-color: #7b93ff;
          --pacman-text-color: #7b93ff;
        }

        /* Wrapper do fantasma - Escala reduzida para 0.35 (personagem bem menor) */
        .pacman-ghost-wrapper {
          position: absolute;
          top: 0;
          left: 0;
          z-index: 2; 
          animation: pacman-walk 4s ease-in-out infinite;
        }

        /* Container do texto - Alinhado horizontalmente com o fantasma menor */
        .pacman-text-container {
          position: absolute;
          top: 8px; /* Ajustado para alinhar perfeitamente ao centro do fantasma de escala 0.35 */
          left: 40px; /* Começa a revelar logo atrás do fantasma menor */
          height: 32px;
          width: 0px; 
          overflow: hidden; 
          white-space: nowrap; 
          animation: pacman-revealText 4s ease-in-out infinite;
        }

        /* Estilo do texto em Pixel Art - Proporcionalmente maior em relação ao fantasma */
        .pacman-pixel-text {
          font-family: 'Press Start 2P', monospace;
          color: var(--pacman-text-color);
          font-size: 16px; /* Tamanho destacado em relação ao fantasma mini */
          line-height: 32px;
        }

        /* Animação de ir e vir reduzida de 250px para 180px para acompanhar o tamanho menor */
        @keyframes pacman-walk {
          0%, 100% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(180px);
          }
        }

        /* Revelação do texto sincronizada com o trajeto menor */
        @keyframes pacman-revealText {
          0%, 100% {
            width: 0px;
          }
          50% {
            width: 180px;
          }
        }

        #pacman-ghost {
          position: relative;
          transform: scale(0.35); /* Personagem muito menor */
          transform-origin: left top; /* Garante o alinhamento correto ao reduzir */
        }

        #pacman-red {
          animation: pacman-upNDown infinite 0.5s;
          position: relative;
          width: 140px;
          height: 140px;
          display: grid;
          grid-template-columns: repeat(14, 1fr);
          grid-template-rows: repeat(14, 1fr);
          grid-column-gap: 0px;
          grid-row-gap: 0px;
          grid-template-areas:
            "a1  a2  a3  a4  a5  top0  top0  top0  top0  a10 a11 a12 a13 a14"
            "b1  b2  b3  top1 top1 top1 top1 top1 top1 top1 top1 b12 b13 b14"
            "c1 c2 top2 top2 top2 top2 top2 top2 top2 top2 top2 top2 c13 c14"
            "d1 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 d14"
            "e1 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 e14"
            "f1 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 f14"
            "top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4"
            "top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4"
            "top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4"
            "top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4"
            "top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4"
            "top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4"
            "st0 st0 an4 st1 an7 st2 an10 an10 st3 an13 st4 an16 st5 st5"
            "an1 an2 an3 an5 an6 an8 an9 an9 an11 an12 an14 an15 an17 an18";
        }

        @keyframes pacman-upNDown {
          0%, 49% {
            transform: translateY(0px);
          }
          50%, 100% {
            transform: translateY(-10px);
          }
        }

        /* Corpo em Azul Marinho Escuro */
        #pacman-top0,
        #pacman-top1,
        #pacman-top2,
        #pacman-top3,
        #pacman-top4,
        #pacman-st0,
        #pacman-st1,
        #pacman-st2,
        #pacman-st3,
        #pacman-st4,
        #pacman-st5 {
          background-color: var(--pacman-color);
        }

        #pacman-top0 { grid-area: top0; }
        #pacman-top1 { grid-area: top1; }
        #pacman-top2 { grid-area: top2; }
        #pacman-top3 { grid-area: top3; }
        #pacman-top4 { grid-area: top4; }
        #pacman-st0 { grid-area: st0; }
        #pacman-st1 { grid-area: st1; }
        #pacman-st2 { grid-area: st2; }
        #pacman-st3 { grid-area: st3; }
        #pacman-st4 { grid-area: st4; }
        #pacman-st5 { grid-area: st5; }

        #pacman-an1 { grid-area: an1; animation: pacman-flicker0 infinite 0.5s; }
        #pacman-an18 { grid-area: an18; animation: pacman-flicker0 infinite 0.5s; }
        #pacman-an2 { grid-area: an2; animation: pacman-flicker1 infinite 0.5s; }
        #pacman-an17 { grid-area: an17; animation: pacman-flicker1 infinite 0.5s; }
        #pacman-an3 { grid-area: an3; animation: pacman-flicker1 infinite 0.5s; }
        #pacman-an16 { grid-area: an16; animation: pacman-flicker1 infinite 0.5s; }
        #pacman-an4 { grid-area: an4; animation: pacman-flicker1 infinite 0.5s; }
        #pacman-an15 { grid-area: an15; animation: pacman-flicker1 infinite 0.5s; }
        #pacman-an6 { grid-area: an6; animation: pacman-flicker0 infinite 0.5s; }
        #pacman-an12 { grid-area: an12; animation: pacman-flicker0 infinite 0.5s; }
        #pacman-an7 { grid-area: an7; animation: pacman-flicker0 infinite 0.5s; }
        #pacman-an13 { grid-area: an13; animation: pacman-flicker0 infinite 0.5s; }
        #pacman-an9 { grid-area: an9; animation: pacman-flicker1 infinite 0.5s; }
        #pacman-an10 { grid-area: an10; animation: pacman-flicker1 infinite 0.5s; }
        #pacman-an8 { grid-area: an8; animation: pacman-flicker0 infinite 0.5s; }
        #pacman-an11 { grid-area: an11; animation: pacman-flicker0 infinite 0.5s; }

        /* Tentáculos piscando */
        @keyframes pacman-flicker0 {
          0%, 49% {
            background-color: var(--pacman-color);
          }
          50%, 100% {
            background-color: transparent;
          }
        }

        @keyframes pacman-flicker1 {
          0%, 49% {
            background-color: transparent;
          }
          50%, 100% {
            background-color: var(--pacman-color);
          }
        }

        #pacman-eye {
          width: 40px;
          height: 50px;
          position: absolute;
          top: 30px;
          left: 10px;
        }

        #pacman-eye::before {
          content: "";
          background-color: white;
          width: 20px;
          height: 50px;
          transform: translateX(10px);
          display: block;
          position: absolute;
        }

        #pacman-eye::after {
          content: "";
          background-color: white;
          width: 40px;
          height: 30px;
          transform: translateY(10px);
          display: block;
          position: absolute;
        }

        #pacman-eye1 {
          width: 40px;
          height: 50px;
          position: absolute;
          top: 30px;
          right: 30px;
        }

        #pacman-eye1::before {
          content: "";
          background-color: white;
          width: 20px;
          height: 50px;
          transform: translateX(10px);
          display: block;
          position: absolute;
        }

        #pacman-eye1::after {
          content: "";
          background-color: white;
          width: 40px;
          height: 30px;
          transform: translateY(10px);
          display: block;
          position: absolute;
        }

        /* Pupilas em Preto */
        #pacman-pupil {
          width: 20px;
          height: 20px;
          background-color: #000000;
          position: absolute;
          top: 50px;
          left: 10px;
          z-index: 1;
          animation: pacman-eyesMovement infinite 3s;
        }

        #pacman-pupil1 {
          width: 20px;
          height: 20px;
          background-color: #000000;
          position: absolute;
          top: 50px;
          right: 50px;
          z-index: 1;
          animation: pacman-eyesMovement infinite 3s;
        }

        @keyframes pacman-eyesMovement {
          0%, 49% {
            transform: translateX(0px);
          }
          50%, 99% {
            transform: translateX(10px);
          }
          100% {
            transform: translateX(0px);
          }
        }

        #pacman-shadow {
          background-color: rgba(0, 0, 0, 0.4);
          width: 140px;
          height: 140px;
          position: absolute;
          border-radius: 50%;
          transform: rotateX(80deg);
          filter: blur(20px);
          top: 80%;
          animation: pacman-shadowMovement infinite 0.5s;
        }

        @keyframes pacman-shadowMovement {
          0%, 49% {
            opacity: 0.5;
          }
          50%, 100% {
            opacity: 0.2;
          }
        }
      `}</style>
      <div className="pacman-scene">
        <div className="pacman-text-container">
          <span className="pacman-pixel-text">Gerando...</span>
        </div>

        <div className="pacman-ghost-wrapper">
          <div id="pacman-ghost">
            <div id="pacman-red">
              <div id="pacman-pupil"></div>
              <div id="pacman-pupil1"></div>
              <div id="pacman-eye"></div>
              <div id="pacman-eye1"></div>
              <div id="pacman-top0"></div>
              <div id="pacman-top1"></div>
              <div id="pacman-top2"></div>
              <div id="pacman-top3"></div>
              <div id="pacman-top4"></div>
              <div id="pacman-st0"></div>
              <div id="pacman-st1"></div>
              <div id="pacman-st2"></div>
              <div id="pacman-st3"></div>
              <div id="pacman-st4"></div>
              <div id="pacman-st5"></div>
              <div id="pacman-an1"></div>
              <div id="pacman-an2"></div>
              <div id="pacman-an3"></div>
              <div id="pacman-an4"></div>
              <div id="pacman-an5"></div>
              <div id="pacman-an6"></div>
              <div id="pacman-an7"></div>
              <div id="pacman-an8"></div>
              <div id="pacman-an9"></div>
              <div id="pacman-an10"></div>
              <div id="pacman-an11"></div>
              <div id="pacman-an12"></div>
              <div id="pacman-an13"></div>
              <div id="pacman-an14"></div>
              <div id="pacman-an15"></div>
              <div id="pacman-an16"></div>
              <div id="pacman-an17"></div>
              <div id="pacman-an18"></div>
            </div>
            <div id="pacman-shadow"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
