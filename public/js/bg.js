// Генерация строки с черными точками (частицами), которые будут использоваться как "падающие элементы"
function generateParticles(n) {
  // Начинаем со случайной позиции частицы
  let value = `${getRandom(2560)}px ${getRandom(2560)}px #000`;

  // Добавляем остальные частицы через запятую
  for (let i = 2; i <= n; i++) {
    value += `, ${getRandom(2560)}px ${getRandom(2560)}px #000`;
  }

  return value; // Возвращаем готовую строку для box-shadow
}

// Генерация строки с белыми точками (звездами), которые просто статично светятся на фоне
function generateStars(n) {
  // Начинаем со случайной позиции звезды
  let value = `${getRandom(2560)}px ${getRandom(2560)}px #fff`;

  // Добавляем остальные звезды через запятую
  for (let i = 2; i <= n; i++) {
    value += `, ${getRandom(2560)}px ${getRandom(2560)}px #fff`;
  }

  return value; // Возвращаем готовую строку для box-shadow
}

// Получение случайного целого числа от 0 до max-1
function getRandom(max) {
  return Math.floor(Math.random() * max);
}

// Главная функция инициализации фона
function initBG() {
  // Создаем разные плотности "падающих частиц"
  const particlesSmall = generateParticles(10000);
  const particlesMedium = generateParticles(5000);
  const particlesLarge = generateParticles(2500);

  // Получаем элементы по ID для каждой группы частиц
  const particles1 = document.getElementById('particles1');
  const particles2 = document.getElementById('particles2');
  const particles3 = document.getElementById('particles3');

  // Применяем стили к маленьким частицам
  if (particles1) {
    particles1.style.cssText = `
      width: 1px;
      height: 1px;
      border-radius: 50%;
      box-shadow: ${particlesSmall}; // множество черных точек
      animation: animStar 50s linear infinite; // анимация падения
    `;
  }

  // Применяем стили к средним частицам
  if (particles2) {
    particles2.style.cssText = `
      width: 1.5px;
      height: 1.5px;
      border-radius: 50%;
      box-shadow: ${particlesMedium};
      animation: animateParticle 100s linear infinite;
    `;
  }

  // Применяем стили к крупным частицам
  if (particles3) {
    particles3.style.cssText = `
      width: 2px;
      height: 2px;
      border-radius: 50%;
      box-shadow: ${particlesLarge};
      animation: animateParticle 150s linear infinite;
    `;
  }

  // Создаем разные плотности белых звезд
  const starsSmall = generateStars(1000);
  const starsMedium = generateStars(500);
  const starsLarge = generateStars(250);

  // Получаем элементы по ID для звезд
  const stars1 = document.getElementById('stars1');
  const stars2 = document.getElementById('stars2');
  const stars3 = document.getElementById('stars3');

  // Применяем стили к маленьким звездам (без анимации)
  if (stars1) {
    stars1.style.cssText = `
      width: 1px;
      height: 1px;
      border-radius: 50%;
      box-shadow: ${starsSmall}; // множество белых точек
    `;
  }

  // Применяем стили к средним звездам
  if (stars2) {
    stars2.style.cssText = `
      width: 1.5px;
      height: 1.5px;
      border-radius: 50%;
      box-shadow: ${starsMedium};
    `;
  }

  // Применяем стили к крупным звездам
  if (stars3) {
    stars3.style.cssText = `
      width: 2px;
      height: 2px;
      border-radius: 50%;
      box-shadow: ${starsLarge};
    `;
  }
}

// При использовании Astro вызываем инициализацию после подмены контента
document.addEventListener('astro:after-swap', initBG);

// Также запускаем инициализацию при первой загрузке страницы
initBG();
