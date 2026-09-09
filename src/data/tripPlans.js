const g = (q) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

export const tripPlans = {
  "2026-10-30": {
    city: "Порту",
    country: "Португалия",
    dayNumber: 1,
    sections: [
      {
        title: "Перелёт",
        icon: "Plane",
        items: [
          { id: "flight-1", text: "Вылет из ТА — 5:20" },
          { id: "flight-2", text: "Цюрих — 8:40" },
          { id: "flight-3", text: "Пересадка, вылет — 9:30" },
          { id: "flight-4", text: "Прибытие в Порто — 11:45" }
        ]
      },
      {
        title: "Трансфер",
        icon: "Car",
        items: [
          { id: "transfer-1", text: "Uber или Bolt до отеля (25 км, ~30 мин, 18–25 €)" }
        ]
      },
      {
        title: "Отель",
        icon: "BedDouble",
        items: [
          {
            id: "hotel-1",
            text: "Carris Porto Ribeira (завтрак включён)",
            address: "Rua de São Pedro 41, 4050-452 Porto",
            mapUrl: g("Carris Porto Ribeira Hotel Porto")
          }
        ]
      },
      {
        title: "Вечер",
        icon: "Ship",
        items: [
          { id: "evening-1", text: "Катание на кораблике — 1 час, 20 € (до 17:00)", mapUrl: g("Douro River boat tour Porto Ribeira") },
          { id: "evening-2", text: "Закат — 17:32" }
        ]
      },
      {
        title: "Ресторан Bacalhau",
        icon: "UtensilsCrossed",
        mapUrl: "https://maps.app.goo.gl/MFhviMZXLGNHP2cH6?g_st=ac",
        items: [
          { id: "resto-1", text: "Comtado Bacalhau — визитная карточка" },
          { id: "resto-2", text: "Bacalhau com broa — треска с корочкой" },
          { id: "resto-3", text: "Закуска: Pastéis de Bacalhau, Carpaccio" },
          { id: "resto-4", text: "Суп — Puff Pastry Soup with mushrooms" },
          { id: "resto-5", text: "Вино — Vinho Verde (Alvarinho) или белое Douro" }
        ]
      }
    ]
  },

  "2026-10-31": {
    city: "Порту",
    country: "Португалия",
    dayNumber: 2,
    sections: [
      {
        title: "Утро",
        icon: "Building2",
        items: [
          {
            id: "bolsa-1",
            text: "Музей Болса (Биржа) — открыто с 9:00, посещение 45 мин, вход с группой",
            mapUrl: g("Palácio da Bolsa Porto")
          }
        ]
      },
      {
        title: "Подъём в город",
        icon: "TramFront",
        items: [
          { id: "funicular-1", text: "На фуникулёре поднимаемся в город (идти 8 мин, билет 4 € в кассе)", mapUrl: g("Funicular dos Guindais Porto") }
        ]
      },
      {
        title: "Маршрут по центру (сверху вниз, от холма к реке)",
        icon: "Compass",
        items: [
          { id: "route-1", text: "Вокзал São Bento (3 мин пешком от фуникулёра)", mapUrl: g("São Bento Station Porto") },
          { id: "route-2", text: "Ратуша и McDonald’s Imperial на площади Свободы", mapUrl: g("McDonalds Imperial Praça da Liberdade Porto") },
          { id: "route-3", text: "Башня Клеригуш — самая высокая колокольня города", mapUrl: g("Torre dos Clérigos Porto") },
          { id: "route-4", text: "Книжный магазин Lello", mapUrl: g("Livraria Lello Porto") },
          { id: "route-5", text: "Улица Санта-Катарина (8 мин на восток)", mapUrl: g("Rua Santa Catarina Porto") },
          { id: "route-6", text: "По пути: капелла (сине-белые азулежу) и кафе Majestic", mapUrl: g("Cafe Majestic Porto") },
          { id: "route-7", text: "Собор Се (Se do Porto) — на юг 8 мин", mapUrl: g("Sé do Porto") },
          { id: "route-8", text: "Улица Цветов (Rua das Flores) — самая живописная, 3 мин от собора", mapUrl: g("Rua das Flores Porto") }
        ]
      },
      {
        title: "К набережной",
        icon: "MapPin",
        items: [
          { id: "rive-1", text: "Снова выходим к Бирже на набережную. Длина маршрута 3,5 км, время в пути 1,5–2 часа" }
        ]
      },
      {
        title: "Вечер — Гайя",
        icon: "Wine",
        items: [
          { id: "taylors-1", text: "Винодельня Taylor’s — дегустационный зал (билет не нужен, до 19:30)", mapUrl: g("Taylor's Port Wine Lodge Vila Nova de Gaia") },
          { id: "wow-1", text: "WOW World of Wine — работает до 1:00, бесплатная смотровая площадка, бары и рестораны", mapUrl: g("WOW World of Wine Gaia") }
        ]
      }
    ]
  },

  "2026-11-01": {
    city: "Назаре",
    country: "Португалия",
    dayNumber: 3,
    sections: [
      {
        title: "Переезд в Назаре",
        icon: "Bus",
        items: [
          { id: "bus-1", text: "Автобус FlixBus — 11:05" },
          { id: "bus-2", text: "Прибытие в Назаре — 13:45" }
        ]
      },
      {
        title: "Трансфер",
        icon: "Car",
        items: [
          { id: "trans-1", text: "До отеля Miramar Hotel and SPA 1 км (такси/Bolt — 4–6 €)" }
        ]
      },
      {
        title: "Отель",
        icon: "BedDouble",
        items: [
          {
            id: "hotel-1",
            text: "Miramar Hotel and SPA (завтрак включён)",
            mapUrl: g("Miramar Hotel and SPA Nazaré")
          }
        ]
      },
      {
        title: "Маяк и волны",
        icon: "Waves",
        items: [
          { id: "far-1", text: "Пешком до фуникулёра 10 мин, вниз к станции Ascensor da Nazaré", mapUrl: g("Ascensor da Nazaré") },
          { id: "far-2", text: "На фуникулёре подъём на вершину скалы Sítio", mapUrl: g("Sítio Nazaré") },
          { id: "far-3", text: "Пешком до маяка Farol da Nazaré 15 мин", mapUrl: g("Farol da Nazaré") },
          { id: "far-4", text: "Закат — 17:34" }
        ]
      },
      {
        title: "Возвращение и SPA",
        icon: "Waves",
        items: [
          { id: "spa-1", text: "Возвращаемся в отель на Uber" },
          { id: "spa-2", text: "SPA работает до 20:00 — записаться на ресепшн, забронировать слот 18:30 (бесплатно)" }
        ]
      },
      {
        title: "Ужин",
        icon: "UtensilsCrossed",
        mapUrl: g("Mar Aberto Restaurant Nazaré"),
        items: [
          { id: "dinner-1", text: "Ресторан Mar Aberto — забронировать столик при check-in на 20:30 у окна с видом" }
        ]
      }
    ]
  },

  "2026-11-02": {
    city: "Синтра",
    country: "Португалия",
    dayNumber: 4,
    sections: [
      {
        title: "Переезд в Синтру",
        icon: "Car",
        items: [
          { id: "move-1", text: "Uber — 100–140 € (1,5 часа)" },
          { id: "move-2", text: "Bolt — 85–100 €" }
        ]
      },
      {
        title: "Отель",
        icon: "BedDouble",
        items: [
          {
            id: "hotel-1",
            text: "Marmoris Palace (завтрак включён)",
            mapUrl: g("Marmoris Palace Sintra")
          }
        ]
      },
      {
        title: "К Кинта да Регалейра (пешком 1,2 км через центр)",
        icon: "Compass",
        items: [
          {
            id: "stop-1",
            text: "Sapa — Fábrica das Queijadas (ул. Volta do Duche 12, вниз от отеля). Покупаем кейжадаш — отлично хранятся",
            mapUrl: g("Sapa Fabrica das Queijadas Sintra")
          },
          {
            id: "stop-2",
            text: "Piriquita — старый центр, кофе и Travesseiro (каса Piriquita)",
            mapUrl: g("Casa Piriquita Sintra")
          },
          { id: "stop-3", text: "7 мин до Кинта да Регалейра, вход 16:30–17:30 (закрытие 18:30)", mapUrl: g("Quinta da Regaleira Sintra") }
        ]
      },
      {
        title: "Возвращение",
        icon: "Car",
        items: [
          { id: "back-1", text: "Возвращаемся в отель на Uber — 5–7 мин (4–7 €)" }
        ]
      },
      {
        title: "Вечер в отеле",
        icon: "Wine",
        items: [
          { id: "eve-1", text: "Дегустация вин и сыров с 17:00 до 19:00" },
          { id: "eve-2", text: "Бассейн 24/7" }
        ]
      }
    ]
  },

  "2026-11-03": {
    city: "Синтра → Лиссабон",
    country: "Португалия",
    dayNumber: 5,
    sections: [
      {
        title: "Замок Пена",
        icon: "Castle",
        items: [
          { id: "pena-1", text: "Едем на тук-туке от ворот отеля до ворот замка — 25–35 € за весь тук-тук (10–15 € с человека), ехать 20 мин, заказ на ресепшн" },
          { id: "pena-2", text: "Билеты на 11:00 — выйти из отеля минимум за час", mapUrl: g("Castelo da Pena Sintra") }
        ]
      },
      {
        title: "Переезд в Лиссабон",
        icon: "Car",
        items: [
          { id: "move-1", text: "Лучший вариант Uber/Bolt — 30 мин, 31 км, 22–32 €" }
        ]
      },
      {
        title: "Отель",
        icon: "BedDouble",
        items: [
          {
            id: "hotel-1",
            text: "Myriad by SANA (завтрак включён)",
            mapUrl: g("Myriad by SANA Hotels Lisbon")
          }
        ]
      },
      {
        title: "Отдых",
        icon: "Waves",
        items: [
          { id: "rest-1", text: "Отдых, СПА до 20:00" }
        ]
      },
      {
        title: "Ужин",
        icon: "UtensilsCrossed",
        mapUrl: g("River Lounge Restaurant Lisbon"),
        items: [
          { id: "dinner-1", text: "River Lounge Restaurant — ужин с 19:30 до 23:00, столик заранее на sanahotels.com" }
        ]
      }
    ]
  },

  "2026-11-04": {
    city: "Лиссабон",
    country: "Португалия",
    dayNumber: 6,
    sections: [
      {
        title: "Маршрут по центру Лиссабона (2,5–3 км, 2–3 часа)",
        icon: "Compass",
        items: [
          { id: "lis-1", text: "Площадь Росиу", mapUrl: g("Praça do Rossio Lisbon") },
          { id: "lis-2", text: "Перейти на площадь Фигейра", mapUrl: g("Praça da Figueira Lisbon") },
          { id: "lis-3", text: "Лифт Санта-Жушта", mapUrl: g("Elevador de Santa Justa Lisbon") },
          { id: "lis-4", text: "Пешеходная улица Руа Аугушта", mapUrl: g("Rua Augusta Lisbon") },
          { id: "lis-5", text: "Триумфальная арка и площадь Коммерции", mapUrl: g("Arco da Rua Augusta Praça do Comércio Lisbon") },
          { id: "lis-6", text: "Улица Rua do Alecrim", mapUrl: g("Rua do Alecrim Lisbon") },
          { id: "lis-7", text: "Руины монастыря Карму", mapUrl: g("Convento do Carmo Lisbon") }
        ]
      },
      {
        title: "Перекус",
        icon: "Coffee",
        items: [
          { id: "snack-1", text: "Pastel de Nata — Fábrica da Nata на вокзале Росиу", mapUrl: g("Fábrica da Nata Rossio Lisbon") },
          { id: "snack-2", text: "Manteigaria (Praça Dom Pedro IV)", mapUrl: g("Manteigaria Praça Dom Pedro IV Lisbon") },
          { id: "snack-3", text: "Жинжинья — Largo São Domingos 8, в нескольких шагах от Росиу", mapUrl: g("Ginja Largo de São Domingos Lisbon") }
        ]
      }
    ]
  },

  "2026-11-05": {
    city: "Лиссабон — Белем",
    country: "Португалия",
    dayNumber: 7,
    sections: [
      {
        title: "Жеронимуш (Белем)",
        icon: "Landmark",
        items: [
          { id: "bel-1", text: "Билет 10:30–11:30, транспорт Uber/Bolt (20–30 мин, 15–25 €)", mapUrl: g("Mosteiro dos Jerónimos Belém Lisbon") },
          { id: "bel-2", text: "После — кафе Pastéis de Belém (3 мин)", mapUrl: g("Pastéis de Belém") },
          { id: "bel-3", text: "Ботанический сад за монастырём — 2–5 €", mapUrl: g("Jardim Botânico Ajuda Lisboa") },
          { id: "bel-4", text: "Вдоль набережной — башня Торри-ди-Белем (15 мин)", mapUrl: g("Torre de Belém") }
        ]
      },
      {
        title: "Вечер — Океанариум",
        icon: "Waves",
        items: [
          { id: "oce-1", text: "На канатной дороге от отеля до океанариума — 7,50 € в один конец (до 18:00)", mapUrl: g("Telecabine Lisboa Parque das Nações") },
          { id: "oce-2", text: "Билеты на oceanario.pt — 25 €, время работы 10:00–20:00 (последний вход 19:00)", mapUrl: g("Oceanário de Lisboa") },
          { id: "oce-3", text: "Возвращение пешком в отель 10 мин по набережной" }
        ]
      }
    ]
  },

  "2026-11-06": {
    city: "Лиссабон",
    country: "Португалия",
    dayNumber: 8,
    sections: [
      {
        title: "Отлёт домой",
        icon: "Plane",
        items: [
          { id: "dep-1", text: "Самолёт в 11:15" },
          { id: "dep-2", text: "До аэропорта 10 мин на Uber", mapUrl: g("Aeroporto Humberto Delgado Lisbon") }
        ]
      }
    ]
  }
};

export const tripDays = [
  { key: "2026-10-30", label: "30 окт", weekday: "Пт" },
  { key: "2026-10-31", label: "31 окт", weekday: "Сб" },
  { key: "2026-11-01", label: "1 ноя", weekday: "Вс" },
  { key: "2026-11-02", label: "2 ноя", weekday: "Пн" },
  { key: "2026-11-03", label: "3 ноя", weekday: "Вт" },
  { key: "2026-11-04", label: "4 ноя", weekday: "Ср" },
  { key: "2026-11-05", label: "5 ноя", weekday: "Чт" },
  { key: "2026-11-06", label: "6 ноя", weekday: "Пт" }
];