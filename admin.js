(() => {
    const loginView = document.getElementById('adminLoginView');
    const panelView = document.getElementById('adminPanelView');
    const loginForm = document.getElementById('adminLoginForm');
    const loginKey = document.getElementById('adminKey');
    const loginButton = document.getElementById('adminLoginButton');
    const loginMessage = document.getElementById('adminLoginMessage');
    const actionMessage = document.getElementById('adminActionMessage');
    const stats = document.getElementById('adminStats');
    const numberInput = document.getElementById('instagramNumber');
    const numberLabel = document.getElementById('instagramNumberLabel');
    const numberNext = document.getElementById('instagramNextNumber');
    const numberMessage = document.getElementById('instagramMessage');
    const numberSave = document.getElementById('instagramSave');
    const numberDecrease = document.getElementById('instagramDecrease');
    const numberIncrease = document.getElementById('instagramIncrease');
    const historyMessage = document.getElementById('historyMessage');
    const historyRows = document.getElementById('historyRows');
    const queryHistoryMessage = document.getElementById('queryHistoryMessage');
    const queryHistoryRows = document.getElementById('queryHistoryRows');
    const sections = [
        document.getElementById('instagramSection'),
        document.getElementById('storyHistorySection'),
        document.getElementById('queryHistorySection'),
    ];
    const histories = [
        {
            path: '/admin/counts/history', message: historyMessage, rows: historyRows,
            from: document.getElementById('storyHistoryFrom'), to: document.getElementById('storyHistoryTo'),
            apply: document.getElementById('storyHistoryApply'), all: document.getElementById('storyHistoryAll'), data: null,
        },
        {
            path: '/admin/counts/queries/history', message: queryHistoryMessage, rows: queryHistoryRows,
            from: document.getElementById('queryHistoryFrom'), to: document.getElementById('queryHistoryTo'),
            apply: document.getElementById('queryHistoryApply'), all: document.getElementById('queryHistoryAll'), data: null,
        },
    ];
    const maxNumber = 9007199254740990;
    let currentNumber = null;
    let sessionVersion = 0;

    function currentKey() {
        return sessionStorage.getItem('infy:adminKey') || '';
    }

    function setView(authenticated) {
        loginView.hidden = authenticated;
        panelView.hidden = !authenticated;
        if (!authenticated) {
            sessionVersion++;
            currentNumber = null;
            numberInput.value = '';
            numberInput.disabled = true;
            numberSave.disabled = true;
            syncNumberControls();
            numberLabel.textContent = 'Current number: loading...';
            numberNext.textContent = '';
            numberMessage.textContent = '';
            stats.replaceChildren();
            historyRows.replaceChildren();
            queryHistoryRows.replaceChildren();
            histories.forEach(history => {
                history.data = null;
                history.from.disabled = false;
                history.to.disabled = false;
            });
            sections.forEach(section => {
                section.open = false;
                delete section.dataset.loaded;
                delete section.dataset.loading;
                section.querySelectorAll('.admin-section-refresh').forEach(button => { button.disabled = false; });
            });
        }
    }

    async function request(path, options = {}) {
        const version = sessionVersion;
        const headers = new Headers(options.headers || {});
        headers.set('Authorization', `Bearer ${currentKey()}`);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
            const response = await fetch(`${window.host}${path}`, { ...options, headers, signal: controller.signal });
            const contentType = response.headers.get('content-type') || '';
            const result = contentType.includes('application/json') ? await response.json() : await response.text();
            if (response.status === 401 && version === sessionVersion) {
                sessionStorage.removeItem('infy:adminKey');
                setView(false);
                loginMessage.textContent = 'Your admin session expired. Please unlock again.';
            }
            if (!response.ok) {
                throw new Error(typeof result === 'object' ? result.error || 'Admin request failed.' : result || 'Admin request failed.');
            }
            return result;
        } finally {
            clearTimeout(timeout);
        }
    }

    async function refreshStatus() {
        const version = sessionVersion;
        try {
            const result = await request('/admin/status');
            if (version !== sessionVersion) return;
            const items = [
                ['Form', result.formOpen ? 'Open' : result.manualFormOpen ? 'Daily limit' : 'Closed'],
                ['Stories today', result.dailyCount],
                ['Stories total', result.totalCount],
                ['Query cooldowns', result.queryCooldowns],
                ['Story cooldowns', result.storyCooldowns],
            ];
            stats.replaceChildren();
            items.forEach(([label, value]) => {
                const wrapper = document.createElement('div');
                wrapper.className = 'admin-stat';
                const term = document.createElement('dt');
                term.textContent = label;
                const description = document.createElement('dd');
                description.textContent = String(value ?? 'Unavailable');
                wrapper.append(term, description);
                stats.appendChild(wrapper);
            });
            document.getElementById('adminToggleForm').querySelector('span').textContent =
                result.manualFormOpen ? 'Close submissions' : 'Open submissions';
            actionMessage.textContent = '';
        } catch (error) {
            if (version !== sessionVersion) return;
            stats.replaceChildren();
            actionMessage.textContent = error.message || 'Could not load admin status.';
        }
    }

    function numberForStep() {
        if (!numberInput.value) return currentNumber;
        if (!/^[0-9]+$/.test(numberInput.value)) return null;
        const value = Number(numberInput.value);
        return Number.isSafeInteger(value) && value <= maxNumber ? value : null;
    }

    function syncNumberControls() {
        const value = numberForStep();
        const disabled = numberInput.disabled || value === null;
        numberDecrease.disabled = disabled || value <= 0;
        numberIncrease.disabled = disabled || value >= maxNumber;
    }

    function displayNumber(result) {
        currentNumber = result.currentNumber;
        numberLabel.textContent = `Current number: ${result.currentNumber}`;
        numberNext.textContent = `Next reservation: ${result.nextNumber}. This may change as jobs are reserved.`;
        numberInput.disabled = false;
        numberSave.disabled = false;
        syncNumberControls();
    }

    async function refreshNumber() {
        const version = sessionVersion;
        numberInput.disabled = true;
        numberSave.disabled = true;
        syncNumberControls();
        numberMessage.textContent = 'Loading sequence...';
        try {
            const result = await request('/admin/instagram/number');
            if (version !== sessionVersion) return false;
            displayNumber(result);
            numberMessage.textContent = '';
            return true;
        } catch (error) {
            if (version !== sessionVersion) return false;
            currentNumber = null;
            numberInput.disabled = true;
            numberSave.disabled = true;
            syncNumberControls();
            numberLabel.textContent = 'Current number: unavailable';
            numberNext.textContent = '';
            numberMessage.textContent = error.message || 'Could not load the Instagram sequence.';
            return false;
        }
    }

    function renderHistory(history) {
        if (!history.data) return;
        history.rows.replaceChildren();
        const fragment = document.createDocumentFragment();
        history.data.forEach(({ date, count }) => {
            const row = document.createElement('tr');
            const dateCell = document.createElement('td');
            const countCell = document.createElement('td');
            dateCell.textContent = date;
            countCell.textContent = String(count);
            row.append(dateCell, countCell);
            fragment.appendChild(row);
        });
        history.rows.appendChild(fragment);
        history.rows.closest('.admin-table-wrap').scrollTop = 0;
        history.message.textContent = history.data.length
            ? `${history.data.length} ${history.data.length === 1 ? 'date' : 'dates'} shown, newest first.`
            : 'No records for the selected dates.';
    }

    async function refreshHistory(history) {
        const version = sessionVersion;
        history.data = null;
        history.rows.replaceChildren();
        if (history.from.validity.badInput || history.to.validity.badInput) {
            history.message.textContent = 'Enter valid dates.';
            return false;
        }
        if (history.from.value && history.to.value && history.from.value > history.to.value) {
            history.message.textContent = 'From date must be on or before To date.';
            return false;
        }
        const params = new URLSearchParams();
        if (history.from.value) params.set('from', history.from.value);
        if (history.to.value) params.set('to', history.to.value);
        const query = params.toString();
        history.from.disabled = true;
        history.to.disabled = true;
        history.apply.disabled = true;
        history.all.disabled = true;
        history.message.textContent = 'Loading history...';
        try {
            const result = await request(query ? `${history.path}?${query}` : history.path);
            if (version !== sessionVersion) return false;
            history.data = result.dailyCounts
                .filter(item => (!history.from.value || item.date >= history.from.value)
                    && (!history.to.value || item.date <= history.to.value))
                .sort((a, b) => b.date.localeCompare(a.date));
            renderHistory(history);
            return true;
        } catch (error) {
            if (version !== sessionVersion) return false;
            history.rows.replaceChildren();
            history.message.textContent = error.message || 'Could not load daily history.';
            return false;
        } finally {
            if (version === sessionVersion) {
                history.from.disabled = false;
                history.to.disabled = false;
                history.apply.disabled = false;
                history.all.disabled = false;
            }
        }
    }

    function refreshDashboard() {
        actionMessage.textContent = 'Refreshing status...';
        void refreshStatus();
    }

    function setupSection(section, refreshButton, load) {
        async function refresh() {
            if (section.dataset.loading) return;
            const version = sessionVersion;
            section.dataset.loading = '1';
            refreshButton.disabled = true;
            try {
                const loaded = await load();
                if (version === sessionVersion) section.dataset.loaded = loaded ? '1' : '';
            } finally {
                if (version === sessionVersion) {
                    delete section.dataset.loading;
                    refreshButton.disabled = false;
                }
            }
        }
        section.addEventListener('toggle', () => {
            if (section.open && currentKey() && !section.dataset.loaded) void refresh();
        });
        refreshButton.addEventListener('click', () => void refresh());
        return refresh;
    }

    setupSection(sections[0], document.getElementById('instagramRefresh'), refreshNumber);
    const refreshStoryHistory = setupSection(sections[1], document.getElementById('storyHistoryRefresh'),
        () => refreshHistory(histories[0]));
    const refreshQueryHistory = setupSection(sections[2], document.getElementById('queryHistoryRefresh'),
        () => refreshHistory(histories[1]));

    const todayIndia = new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);
    const fromIndia = new Date(Date.parse(`${todayIndia}T00:00:00Z`) - 6 * 24 * 60 * 60 * 1000)
        .toISOString().slice(0, 10);
    histories.forEach((history, index) => {
        history.from.value = fromIndia;
        history.to.value = todayIndia;
        const markChanged = () => {
            history.data = null;
            history.rows.replaceChildren();
            history.message.textContent = 'Dates changed. Select Apply dates.';
        };
        history.from.addEventListener('change', markChanged);
        history.to.addEventListener('change', markChanged);
        const refresh = index === 0 ? refreshStoryHistory : refreshQueryHistory;
        history.apply.addEventListener('click', () => void refresh());
        history.all.addEventListener('click', () => {
            history.from.value = '';
            history.to.value = '';
            void refresh();
        });
    });

    async function runAction(button, path, label, confirmation) {
        if (confirmation && !(await showConfirmationModal(confirmation, { title: 'Confirm admin action', confirmText: 'Continue' }))) return;
        button.disabled = true;
        actionMessage.textContent = `${label}...`;
        try {
            const result = await request(path, { method: 'POST' });
            await refreshStatus();
            actionMessage.textContent = result.message || `${label} complete.`;
        } catch (error) {
            actionMessage.textContent = error.message || `${label} failed.`;
        } finally {
            button.disabled = false;
        }
    }

    loginForm.addEventListener('submit', async event => {
        event.preventDefault();
        if (!loginForm.reportValidity()) return;
        loginButton.disabled = true;
        loginMessage.textContent = 'Checking the key...';
        const key = loginKey.value;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
            const response = await fetch(`${window.host}/admin/authenticate`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key }), signal: controller.signal,
            });
            const result = await response.json();
            if (!response.ok) {
                loginMessage.textContent = response.status === 401 ? 'That key did not unlock the control room.' : result.error || 'Admin access is unavailable.';
                loginKey.value = '';
                return;
            }
            if ('PasswordCredential' in window && navigator.credentials?.store) {
                try {
                    navigator.credentials.store(new PasswordCredential({ id: 'Infy Stories Admin', name: 'Infy Stories Admin', password: key }))
                        .catch(error => console.warn('Could not save admin credential:', error));
                } catch (error) {
                    console.warn('Could not save admin credential:', error);
                }
            }
            sessionStorage.setItem('infy:adminKey', key);
            loginKey.value = '';
            loginMessage.textContent = '';
            setView(true);
            refreshDashboard();
        } catch (error) {
            loginMessage.textContent = 'Could not reach the control room. Check the connection and try again.';
        } finally {
            clearTimeout(timeout);
            loginButton.disabled = false;
        }
    });

    numberInput.addEventListener('input', () => {
        numberInput.value = numberInput.value.replace(/[^0-9]/g, '');
        syncNumberControls();
    });
    function stepNumber(amount) {
        const value = numberForStep();
        if (numberInput.disabled || value === null || value + amount < 0 || value + amount > maxNumber) return;
        numberInput.value = String(value + amount);
        numberMessage.textContent = '';
        syncNumberControls();
    }
    numberDecrease.addEventListener('click', () => stepNumber(-1));
    numberIncrease.addEventListener('click', () => stepNumber(1));
    document.getElementById('instagramNumberForm').addEventListener('submit', async event => {
        event.preventDefault();
        const value = numberInput.value;
        const number = Number(value);
        if (!/^[0-9]+$/.test(value) || !Number.isSafeInteger(number) || number > maxNumber) {
            numberMessage.textContent = `Enter a whole number between 0 and ${maxNumber}.`;
            return;
        }
        if (currentNumber === null) return;
        const warning = number < currentNumber ? ' Lowering it can reuse numbers already assigned to posts.' : '';
        if (!(await showConfirmationModal(`Change the last allocated Instagram number from ${currentNumber} to ${number}?${warning}`, {
            title: 'Update Instagram sequence', confirmText: 'Update',
        }))) return;
        const version = sessionVersion;
        numberSave.disabled = true;
        numberInput.disabled = true;
        syncNumberControls();
        numberMessage.textContent = 'Updating sequence...';
        try {
            const result = await request('/admin/instagram/number', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentNumber: number }),
            });
            if (version !== sessionVersion) return;
            displayNumber(result);
            numberInput.value = '';
            syncNumberControls();
            numberMessage.textContent = 'Instagram sequence updated.';
        } catch (error) {
            if (version !== sessionVersion) return;
            numberMessage.textContent = error.message || 'Could not update the Instagram sequence.';
            if (currentKey()) {
                numberInput.disabled = false;
                numberSave.disabled = false;
                syncNumberControls();
            }
        }
    });

    document.getElementById('adminRefresh').addEventListener('click', refreshDashboard);
    document.getElementById('adminWriteStory').addEventListener('click', () => {
        sessionStorage.setItem('storyEditorEntry', JSON.stringify({ mode: 'admin', created: Date.now() }));
        window.location.href = 'write/new/';
    });
    document.getElementById('adminToggleForm').addEventListener('click', event =>
        void runAction(event.currentTarget, '/admin/form-status', 'Updating form status'));
    document.getElementById('adminClearIps').addEventListener('click', event =>
        void runAction(event.currentTarget, '/admin/ip-cooldowns', 'Clearing IP cooldowns', 'Clear story and query cooldown entries on this running API instance?'));
    document.getElementById('adminLogout').addEventListener('click', () => {
        sessionStorage.removeItem('infy:adminKey');
        loginMessage.textContent = '';
        loginKey.value = '';
        setView(false);
        loginKey.focus();
    });
    document.getElementById('adminPasswordReveal').addEventListener('click', event => {
        const reveal = loginKey.type === 'password';
        loginKey.type = reveal ? 'text' : 'password';
        const button = event.currentTarget;
        button.setAttribute('aria-pressed', String(reveal));
        button.setAttribute('aria-label', reveal ? 'Hide admin key' : 'Show admin key');
        button.title = reveal ? 'Hide admin key' : 'Show admin key';
        button.querySelector('i').className = reveal ? 'fas fa-eye-slash' : 'fas fa-eye';
        loginKey.focus();
    });

    if (sessionStorage.getItem('infy:adminPrompt') === '1') {
        sessionStorage.removeItem('infy:adminPrompt');
        sessionStorage.removeItem('infy:adminKey');
        loginMessage.textContent = 'Please unlock admin access again.';
    }
    if (currentKey()) {
        setView(true);
        refreshDashboard();
    } else {
        setView(false);
    }
})();
