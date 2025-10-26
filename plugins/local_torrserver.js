(function () {
    // 1. Настройки поиска TorrServer
    const ports = [8090, 8080];
    const hosts = ['127.0.0.1', 'localhost'];
    const subnets = ['192.168.0', '192.168.1', '10.0.0'];
    const timeout = 1000;

    // 2. Функция fetch с таймаутом
    async function fetchWithTimeout(url, ms = 1000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), ms);
        try {
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(id);
            return res;
        } catch {
            clearTimeout(id);
            return null;
        }
    }

    // 3. Проверка одного хоста
    async function checkHost(host, port) {
        const url = `http://${host}:${port}/`;
        const res = await fetchWithTimeout(url, timeout);
        if (res && res.ok) {
            const text = await res.text().catch(() => '');
            if (/torrserver|torrsrv|version|json/i.test(text)) {
                return { host, port };
            }
        }
        return null;
    }

    // 4. Основной поиск в сети
    async function discoverTorrServer() {
        const candidates = [];

        // localhost
        hosts.forEach(h => ports.forEach(p => candidates.push({ h, p })));

        // Локальная сеть 192.168.x.x, 10.x.x.x (только первые 10 IP каждого подсети)
        subnets.forEach(base => {
            for (let i = 1; i <= 10; i++) {
                const ip = `${base}.${i}`;
                ports.forEach(p => candidates.push({ h: ip, p }));
            }
        });

        for (const { h, p } of candidates) {
            const res = await checkHost(h, p);
            if (res) return res; // возвращаем первый найденный сервер
        }
        return null;
    }

    // 5. Открытие настроек плагина в Lampa
    function openLocalSettings() {
        const stored = Lampa.Storage.get('local_torrserver') || {};
        const ip = stored.ip || 'не найден';
        const port = stored.port || '';

        const html = $('<div class="about"><div class="about__title">Локальный TorrServer</div></div>');
        const field = $('<div class="selector" data-name="ip" data-type="input">IP: <span>' + ip + '</span></div>');
        const fieldPort = $('<div class="selector" data-name="port" data-type="input">Порт: <span>' + port + '</span></div>');
        const buttonAdd = $('<div class="selector" data-name="add" data-type="button">Добавить в альтернативный сервер</div>');

        html.append(field).append(fieldPort).append(buttonAdd);

        const settings = new Lampa.Settings({
            title: 'Локальный TorrServer',
            html: html,
            onBack: () => Lampa.Controller.toggle('settings')
        });

        Lampa.Controller.add('local_torrserver', {
            toggle: () => {
                Lampa.Controller.collectionSet(html);
                Lampa.Controller.collectionFocus(field[0], html);
            },
            back: () => Lampa.Controller.toggle('settings')
        });

        // Кнопка "Добавить в альтернативный сервер"
        settings.render().on('hover:enter', (e) => {
            const name = $(e.target).data('name');
            if (name === 'add') {
                const data = Lampa.Storage.get('local_torrserver');
                if (data && data.ip && data.port) {
                    const url = `http://${data.ip}:${data.port}`;
                    Lampa.Storage.set('torrserver_url_alternative', url);
                    Lampa.Noty.show(`Добавлен альтернативный сервер: ${url}`);
                } else {
                    Lampa.Noty.show('Сначала нужно найти сервер');
                }
            }
        });

        // Редактирование полей вручную
        settings.render().on('update', (e, name, value) => {
            const data = Lampa.Storage.get('local_torrserver') || {};
            if (name === 'ip') data.ip = value;
            if (name === 'port') data.port = value;
            Lampa.Storage.set('local_torrserver', data);
        });
    }

    // 6. Регистрация плагина
    window.Plugin.create('Checker TorrServer', plugin => {
        console.log('Checker TorrServer plugin initialized');

        // Встроить в настройки TorrServer
        if (Lampa.SettingsApi && Lampa.SettingsApi.addSubComponent) {
            Lampa.SettingsApi.addSubComponent('torrserver', {
                component: 'local_torrserver',
                name: 'Локальный TorrServer',
                onEnter: openLocalSettings
            });
        }

        // Автопоиск сервера при запуске
        discoverTorrServer().then(server => {
            if (server) {
                Lampa.Storage.set('local_torrserver', { ip: server.host, port: server.port });
                Lampa.Noty.show(`TorrServer найден: ${server.host}:${server.port}`);
            } else {
                Lampa.Noty.show('TorrServer не найден');
            }
        });
    });
})();