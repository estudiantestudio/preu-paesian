// data.js — Solo datos (sin PDFs). Puedes reemplazar links por tus curadurías reales.

window.PREU_DATA = {
  subjects: [
    { id: "paes_leng", name: "PAES Lenguaje", track: "PAES" },
    { id: "paes_m1", name: "PAES Matemática M1", track: "PAES" },
    { id: "paes_m2", name: "PAES Matemática M2", track: "PAES" },
    { id: "paes_ciencias", name: "PAES Ciencias", track: "PAES" },
    { id: "paes_hist", name: "PAES Historia", track: "PAES" },
    { id: "ib_math_sl", name: "IB Math SL", track: "IB" },
    { id: "ib_math_hl", name: "IB Math HL", track: "IB" },
    { id: "ib_phy_sl", name: "IB Physics SL", track: "IB" },
    { id: "ib_phy_hl", name: "IB Physics HL", track: "IB" },
    { id: "ib_hist", name: "IB History", track: "IB" }
  ],

  // Temas ordenados por eje/nivel. Incluye videos curados (ejemplos).
  topics: [
    {
      id: "mrua",
      subject: "ib_phy_sl",
      title: "MRUA (Movimiento rectilíneo uniformemente acelerado)",
      axis: "Mecánica",
      level: "basico",
      learn: {
        miniClasses: [
          { title: "MRUA en 10 minutos", minutes: 10, url: "https://www.youtube.com/results?search_query=MRUA+explicaci%C3%B3n+10+min" },
          { title: "Errores comunes en MRUA", minutes: 8, url: "https://www.youtube.com/results?search_query=errores+comunes+MRUA" }
        ],
        deepClasses: [
          { title: "MRUA: derivación y gráficos", minutes: 35, url: "https://www.youtube.com/results?search_query=MRUA+derivaci%C3%B3n+gr%C3%A1ficos" }
        ],
        altStyles: [
          { title: "Explicación visual (gráficos)", url: "https://www.youtube.com/results?search_query=MRUA+gr%C3%A1ficos+explicaci%C3%B3n+visual" },
          { title: "Explicación Feynman (simple)", url: "https://www.youtube.com/results?search_query=MRUA+explicaci%C3%B3n+simple+feynman" }
        ]
      },
      practice: { questionIds: ["q1"] }
    },
    {
      id: "funciones",
      subject: "paes_m1",
      title: "Funciones (dominio, rango y gráfica)",
      axis: "Álgebra",
      level: "medio",
      learn: {
        miniClasses: [
          { title: "Dominio y rango rápido", minutes: 12, url: "https://www.youtube.com/results?search_query=dominio+y+rango+explicaci%C3%B3n" }
        ],
        deepClasses: [
          { title: "Funciones: análisis completo", minutes: 45, url: "https://www.youtube.com/results?search_query=funciones+matem%C3%A1tica+PAES+explicaci%C3%B3n" }
        ],
        altStyles: [
          { title: "Explicación por ejemplos (PAES)", url: "https://www.youtube.com/results?search_query=funciones+ejercicios+PAES+paso+a+paso" }
        ]
      },
      practice: { questionIds: ["q2"] }
    },
    {
      id: "comprension",
      subject: "paes_leng",
      title: "Comprensión lectora (ideas, inferencias, propósito)",
      axis: "Lectura",
      level: "medio",
      learn: {
        miniClasses: [
          { title: "Inferencias en 8 min", minutes: 8, url: "https://www.youtube.com/results?search_query=PAES+comprensi%C3%B3n+lectora+inferencias" }
        ],
        deepClasses: [
          { title: "Estrategias de lectura (PAES)", minutes: 50, url: "https://www.youtube.com/results?search_query=estrategias+lectura+PAES" }
        ],
        altStyles: [
          { title: "Método: subrayado inteligente", url: "https://www.youtube.com/results?search_query=subrayado+inteligente+comprensi%C3%B3n+lectora" }
        ]
      },
      practice: { questionIds: ["q3"] }
    }
  ],

  // Banco de preguntas demo (puedes crecerlo)
  questions: [
    {
      id: "q1",
      subject: "ib_phy_sl",
      stem: "Un auto parte desde reposo y acelera uniformemente a 2 m/s² durante 5 s. ¿Qué distancia recorre?",
      options: ["10 m", "20 m", "25 m", "50 m"],
      answerIndex: 2,
      explanation: [
        "Datos: u=0, a=2, t=5.",
        "Fórmula: s = u·t + ½ a t².",
        "s = 0 + ½·2·(5²) = 1·25 = 25 m."
      ],
      commonMistakes: ["Olvidar el 1/2 en ½at²", "Usar v·t sin calcular v promedio"]
    },
    {
      id: "q2",
      subject: "paes_m1",
      stem: "Si f(x)=x²-4, ¿cuál es el conjunto de valores (rango) de f(x) para x∈ℝ?",
      options: ["ℝ", "y≥-4", "y≤-4", "y>-4"],
      answerIndex: 1,
      explanation: [
        "x² ≥ 0 para todo real.",
        "Entonces x² - 4 ≥ -4.",
        "El mínimo ocurre en x=0: f(0)=-4."
      ],
      commonMistakes: ["Confundir dominio con rango", "Olvidar que x² no puede ser negativo"]
    },
    {
      id: "q3",
      subject: "paes_leng",
      stem: "En un texto argumentativo, la tesis es…",
      options: [
        "una anécdota para captar atención",
        "la idea principal que el autor defiende",
        "una cita de un experto",
        "un dato estadístico"
      ],
      answerIndex: 1,
      explanation: [
        "La tesis es la postura central del autor.",
        "Los argumentos y evidencias sirven para sostenerla."
      ],
      commonMistakes: ["Confundir tesis con evidencia", "Pensar que tesis = título"]
    }
  ],

  motivationalMessages: [
    "Vas bien. Esto es normal. Paso a paso.",
    "Un error = aprendizaje. Estás mejorando.",
    "No necesitas perfección, necesitas constancia.",
    "Hoy solo avanza 1%. Eso se acumula.",
    "Si algo no te funcionó, probamos otra explicación."
  ],

  vocational: {
    careers: [
      { name: "Ingeniería Civil", weight: { m1: 0.25, m2: 0.35, leng: 0.15, ciencias: 0.25 } },
      { name: "Derecho", weight: { m1: 0.20, leng: 0.45, historia: 0.35 } },
      { name: "Medicina", weight: { m1: 0.20, leng: 0.15, ciencias: 0.65 } }
    ]
  }
};
