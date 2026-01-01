(function() {
    const windowTemplate = `
        <appcontentholder class="bootskin-app">
            <style>
                .bootskin-app { display: flex; flex-direction: column; height: 100%; }
                .bootskin-app .list-container { flex-grow: 1; border: 1px inset #fff; background: white; overflow-y: auto; margin: 5px; padding: 2px; }
                .bootskin-app .skin-item { display: flex; padding: 5px; border: 1px solid transparent; cursor: default; }
                .bootskin-app .skin-item.selected { border: 1px dotted #000; background-color: #d4e4f8; }
                .bootskin-app .skin-item img, .bootskin-app .skin-item video { width: 120px; height: 90px; object-fit: cover; border: 1px solid grey; margin-right: 8px; background-color: #000; }
                .bootskin-app .skin-info h3 { margin: 0 0 3px 0; font-size: 13px; }
                .bootskin-app .skin-info p { margin: 0; font-size: 11px; color: #555; }
                .bootskin-app .status-bar { padding: 3px 8px; border-top: 1px solid #ccc; font-size: 11px; }
                .bootskin-app .btn-container { padding: 8px; text-align: right; border-top: 1px solid #ccc; }
            </style>
            <appnavigation>
                <ul class="appmenus">
                    <li>File 
                        <ul class="submenu">
                            <li data-action="new">New boot screen...</li>
                            <li data-action="reset">Reset all boot screens</li>
                            <li class="divider"></li>
                            <li data-action="exit">Exit</li>
                        </ul>
                    </li>
                    <li>Help 
                        <ul class="submenu">
                            <li data-action="publish">Publish a skin...</li>
                            <li class="divider"></li>
                            <li data-action="about">About BootSkin</li>
                        </ul>
                    </li>
                </ul>
            </appnavigation>
            <p style="margin: 8px 8px 0 8px;">Select a boot screen from the list below:</p>
            <div class="list-container"></div>
            <div class="status-bar">Currently using: <span id="current-skin-name"></span></div>
            <div class="btn-container">
                <winbutton id="edit-btn" class="disabled"><btnopt>Edit</btnopt></winbutton>
                <winbutton id="preview-btn" class="disabled"><btnopt>Preview</btnopt></winbutton>
                <winbutton id="apply-btn" class="default" disabled><btnopt>Apply</btnopt></winbutton>
            </div>
        </appcontentholder>
    `;

    const editDialogTemplate = (skin) => `
        <appcontentholder class="dialogsrv-32" style="padding: 15px;">
            <p style="margin-top:0;">Edit properties for <strong>${skin.name}</strong>:</p>
            <div style="margin-bottom: 10px;">
                <label for="bootskin-edit-name">Name:</label>
                <input type="text" id="bootskin-edit-name" value="${skin.name}" style="width: 100%;">
            </div>
            <div style="margin-bottom: 10px;">
                <label for="bootskin-edit-style">Display style:</label>
                <select id="bootskin-edit-style" style="width: 100%; height: 21px;">
                    <option value="contain" ${skin.style === 'contain' ? 'selected' : ''}>Contain (Fit to screen, keep aspect ratio)</option>
                    <option value="cover" ${skin.style === 'cover' ? 'selected' : ''}>Cover (Fill screen, keep aspect ratio)</option>
                    <option value="stretch" ${skin.style === 'stretch' ? 'selected' : ''}>Stretch (Fill screen, ignore aspect ratio)</option>
                    <option value="center" ${skin.style === 'center' ? 'selected' : ''}>Center (Original size)</option>
                </select>
            </div>
            <div style="margin-bottom: 10px;">
                <label for="bootskin-edit-bgcolor">Background color:</label>
                <input type="color" id="bootskin-edit-bgcolor" value="${skin.bgColor || '#000000'}" style="width: 100%; height: 24px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label for="bootskin-edit-delay">Boot time (milliseconds):</label>
                <input type="number" id="bootskin-edit-delay" value="${skin.delay || '4000'}" min="500" step="100" style="width: 100%;">
            </div>
            <btncontainer class="right">
                <winbutton id="edit-ok-btn" class="default"><btnopt>OK</btnopt></winbutton>
                <winbutton id="edit-cancel-btn"><btnopt>Cancel</btnopt></winbutton>
            </btncontainer>
        </appcontentholder>
    `;

    const defaultSkins = [
        { id: 'default-xp-pro', name: 'Default System Boot Screen', author: 'Microsoft', description: 'The original Windows XP Professional boot screen.', type: 'gif', path: 'skins/boot.gif', style: 'contain', bgColor: '#000000', delay: 4000 },
        { id: 'xp-home', name: 'Windows XP Home Edition', author: 'Microsoft', description: 'The boot screen from Windows XP Home Edition.', type: 'gif', path: 'skins/home.gif', style: 'contain', bgColor: '#000000', delay: 4000 },
        { id: 'tablet-pc', name: 'Tablet PC Edition', author: 'Microsoft', description: 'Boot screen from the Tablet PC Edition.', type: 'gif', path: 'skins/tablet-pc.gif', style: 'contain', bgColor: '#000000', delay: 4000 },
        { id: 'whistler', name: 'Windows Whistler', author: 'Microsoft', description: 'A pre-release boot screen from codename Whistler.', type: 'gif', path: 'skins/whistler.gif', style: 'contain', bgColor: '#000000', delay: 4000 },
        { id: 'x64', name: 'Windows XP x64 Edition', author: 'Microsoft', description: 'Boot screen from the 64-bit edition.', type: 'gif', path: 'skins/x64.gif', style: 'contain', bgColor: '#000000', delay: 4000 },
        { id: 'horror', name: 'Windows XP Horror Edition', author: 'WobbyChip', description: 'The boot screen of the horror.', type: 'gif', path: 'skins/horror.gif', style: 'stretch', bgColor: '#230000', delay: 2743 }
    ];

    let selfWindowRef = null;
    let selectedSkinId = null;
    let installPath = null;

    const isAbsoluteVFSPath = (path) => /^[A-Z]:\//i.test(path);

    function resolveSkinPath(skin) {
        if (!skin || !skin.path) return '';
        if (isAbsoluteVFSPath(skin.path)) {
            return skin.path;
        }
        if (installPath) {
            return dm.join(installPath, skin.path);
        }
        return skin.path; // Fallback for safety
    }

    function getSkins() {
        const customSkins = JSON.parse(localStorage.getItem('bootSkins') || '[]');
        const customSkinsMap = new Map(customSkins.map(s => [s.id, s]));
        const effectiveSkins = defaultSkins.map(defaultSkin => 
            customSkinsMap.get(defaultSkin.id) || defaultSkin
        );
        const pureCustomSkins = customSkins.filter(cs => !defaultSkins.some(ds => ds.id === cs.id));
        return [...effectiveSkins, ...pureCustomSkins];
    }

    function renderSkins() {
        const container = selfWindowRef.querySelector('.list-container');
        const statusName = selfWindowRef.querySelector('#current-skin-name');
        container.innerHTML = '';
        const skins = getSkins();
        const activeSkinId = localStorage.getItem('activeBootSkin') || 'default-xp-pro';
        statusName.textContent = skins.find(s => s.id === activeSkinId)?.name || 'Default System Boot Screen';
        skins.forEach(skin => {
            const item = document.createElement('div');
            item.className = 'skin-item';
            item.dataset.skinId = skin.id;
            const isActive = skin.id === activeSkinId;
            
            const finalImagePath = resolveSkinPath(skin);
            const finalSrc = dm.getVfsUrl(finalImagePath);
            let mediaHTML;
            if (skin.type === 'video') {
                mediaHTML = `<video muted loop autoplay playsinline src="${finalSrc}" alt="${skin.name}" style="background-color: ${skin.bgColor || '#000000'};"></video>`;
            } else {
                mediaHTML = `<img src="${finalSrc}" alt="${skin.name}" style="background-color: ${skin.bgColor || '#000000'};">`;
            }

            item.innerHTML = `
                ${mediaHTML}
                <div class="skin-info">
                    <h3>${skin.name} ${isActive ? '(Active)' : ''}</h3>
                    <p>Author: ${skin.author}</p>
                    <p>${skin.description}</p>
                </div>
            `;
            container.appendChild(item);
            item.addEventListener('click', () => {
                container.querySelectorAll('.skin-item.selected').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
                selectedSkinId = skin.id;
                selfWindowRef.querySelector('#apply-btn').classList.remove('disabled');
                selfWindowRef.querySelector('#preview-btn').classList.remove('disabled');
                selfWindowRef.querySelector('#edit-btn').classList.remove('disabled');
            });
        });
    }
    
    function applySkin() {
        if (!selectedSkinId) return;
        const skinToApply = getSkins().find(s => s.id === selectedSkinId);
        if (skinToApply) {
            localStorage.setItem('activeBootSkin', selectedSkinId);
            localStorage.setItem('bootDelay', skinToApply.delay || 4000);
            
            let skinConfigToSave = { ...skinToApply };
            skinConfigToSave.path = resolveSkinPath(skinToApply);

            if (selectedSkinId === 'default-xp-pro') {
                localStorage.removeItem('activeBootSkinConfig');
            } else {
                localStorage.setItem('activeBootSkinConfig', JSON.stringify(skinConfigToSave));
            }
        }
        renderSkins();
        selfWindowRef.querySelector('#apply-btn').classList.add('disabled');
        dialogHandler.spawnDialog({ icon: 'info', title: 'Success', text: 'The new boot screen has been applied.', buttons: [['OK', (e) => wm.closeWindow(e.target.closest('app').id)]] });
    }

    async function addNewSkin() {
        const path = await wm.openFileDialog({ title: 'Select Boot Screen Media', filters: [{ name: 'Media Files', extensions: ['gif', 'mp4', 'webm', 'jpg', 'jpeg', 'png'] }] });
        if (!path) return;
        const skinToEdit = {
            name: dm.basename(path).split('.')[0],
            style: 'contain',
            bgColor: '#000000',
            delay: 4000
        };
        const editedSkin = await openEditDialog(skinToEdit, "New Boot Screen");
        if (!editedSkin) return;
        const ext = path.split('.').pop().toLowerCase();
        const type = ['mp4', 'webm'].includes(ext) ? 'video' : ['jpg', 'jpeg', 'png'].includes(ext) ? 'image' : 'gif';
        const newSkin = {
            id: `custom-${Date.now()}`,
            name: editedSkin.name,
            author: shell._currentUser || 'User',
            description: `Custom boot screen added on ${new Date().toLocaleDateString()}`,
            type: type,
            path: path,
            style: editedSkin.style,
            bgColor: editedSkin.bgColor,
            delay: editedSkin.delay
        };
        const customSkins = JSON.parse(localStorage.getItem('bootSkins') || '[]');
        customSkins.push(newSkin);
        localStorage.setItem('bootSkins', JSON.stringify(customSkins));
        renderSkins();
    }

    function openEditDialog(skin, title) {
        return new Promise(resolve => {
            const dialogContent = document.createElement('div');
            dialogContent.innerHTML = editDialogTemplate(skin);
            const hWnd = wm.createNewWindow('bootskinEditPrompt', dialogContent.firstElementChild, {
                parent: selfWindowRef.id,
                skipIteratedPosition: true
            });
            wm.setCaption(hWnd, title);
            wm.setSize(hWnd, 320, 275);
            wm.setDialog(hWnd);
            wm.removeIcon(hWnd);
            const createdDialogWindow = wm._windows[hWnd];
            const nameInput = createdDialogWindow.querySelector('#bootskin-edit-name');
            const styleSelect = createdDialogWindow.querySelector('#bootskin-edit-style');
            const bgColorInput = createdDialogWindow.querySelector('#bootskin-edit-bgcolor');
            const delayInput = createdDialogWindow.querySelector('#bootskin-edit-delay');
            nameInput.focus();
            nameInput.select();
            const closeAndResolve = (value) => {
                wm.closeWindow(hWnd);
                resolve(value);
            };
            createdDialogWindow.querySelector('#edit-ok-btn').onclick = () => {
                const newName = nameInput.value.trim();
                if (!newName) {
                    dialogHandler.spawnDialog({icon: 'warning', title: 'Invalid Name', text: 'Please enter a name for the boot screen.', buttons: [['OK', (e) => wm.closeWindow(e.target.closest('app').id)]]});
                    return;
                }
                closeAndResolve({ name: newName, style: styleSelect.value, bgColor: bgColorInput.value, delay: parseInt(delayInput.value) || 4000 });
            };
            createdDialogWindow.querySelector('#edit-cancel-btn').onclick = () => closeAndResolve(null);
        });
    }

    async function editSelectedSkin() {
        if (!selectedSkinId) return;
        const skins = getSkins();
        const skinToEdit = skins.find(s => s.id === selectedSkinId);
        if (!skinToEdit) return;
        const editedSkin = await openEditDialog(skinToEdit, "Edit Boot Screen");
        if (editedSkin) {
            const customSkins = JSON.parse(localStorage.getItem('bootSkins') || '[]');
            let existingCustomIndex = customSkins.findIndex(s => s.id === selectedSkinId);
            const finalSkinData = { ...skinToEdit, ...editedSkin };

            if (existingCustomIndex > -1) {
                customSkins[existingCustomIndex] = finalSkinData;
            } else {
                customSkins.push(finalSkinData);
            }
            
            localStorage.setItem('bootSkins', JSON.stringify(customSkins));
            renderSkins();
        }
    }

    function resetSkins() {
        dialogHandler.spawnDialog({
            icon: 'question',
            title: 'Confirm Reset',
            text: 'Are you sure you want to remove all custom boot screens and reset to the defaults?',
            buttons: [
                ['Yes', (e) => {
                    wm.closeWindow(e.target.closest('app').id);
                    localStorage.removeItem('bootSkins');
                    localStorage.removeItem('activeBootSkinConfig');
                    localStorage.setItem('activeBootSkin', 'default-xp-pro');
                    localStorage.setItem('bootDelay', 4000);
                    renderSkins();
                    dialogHandler.spawnDialog({icon: 'info', title: 'Reset Complete', text: 'All boot screens have been reset.', buttons: [['OK', (e) => wm.closeWindow(e.target.closest('app').id)]]});
                }],
                ['No', (e) => wm.closeWindow(e.target.closest('app').id)]
            ]
        });
    }

    function showPreview() {
        if (!selectedSkinId) return;
        const skin = getSkins().find(s => s.id === selectedSkinId);
        if (!skin || !shell || !shell._origin) return;

        const previewOverlay = document.createElement('div');
        previewOverlay.style.cssText = `
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            z-index: 99999999; display: flex; align-items: center; justify-content: center;
            background-color: ${skin.bgColor || '#000000'};
            cursor: none;
        `;

        let mediaElement;
        if (skin.type === 'video') {
            mediaElement = document.createElement('video');
            mediaElement.autoplay = true; mediaElement.loop = true; mediaElement.muted = true; mediaElement.playsInline = true;
        } else {
            mediaElement = document.createElement('img');
        }
        
        const finalImagePath = resolveSkinPath(skin);
        mediaElement.src = dm.getVfsUrl(finalImagePath);
        
        mediaElement.style.width = 'auto';
        mediaElement.style.height = 'auto';
        mediaElement.style.maxWidth = 'none';
        mediaElement.style.maxHeight = 'none';

        switch(skin.style) {
            case 'cover':
                mediaElement.style.width = '100%';
                mediaElement.style.height = '100%';
                mediaElement.style.objectFit = 'cover';
                break;
            case 'stretch':
            case 'fill':
                mediaElement.style.width = '100%';
                mediaElement.style.height = '100%';
                mediaElement.style.objectFit = 'fill';
                break;
            case 'center':
                mediaElement.style.objectFit = 'none';
                break;
            case 'contain':
            default:
                mediaElement.style.maxWidth = '100%';
                mediaElement.style.maxHeight = '100%';
                mediaElement.style.objectFit = 'contain';
                break;
        }
        
        previewOverlay.appendChild(mediaElement);
        shell._origin.appendChild(previewOverlay);

        const dismissPreview = () => {
            previewOverlay.remove();
            previewOverlay.removeEventListener('pointermove', dismissPreview);
            previewOverlay.removeEventListener('click', dismissPreview);
            window.removeEventListener('keydown', dismissPreview);
        };

        previewOverlay.addEventListener('pointermove', dismissPreview, { once: true });
        previewOverlay.addEventListener('click', dismissPreview, { once: true });
        window.addEventListener('keydown', dismissPreview, { once: true });
    }

    registerApp({
        _template: null,
        setup: async function() { this._template = document.createElement("template"); this._template.innerHTML = windowTemplate; },
        start: function(options = {}) {
            installPath = options.installPath;
            if (!installPath) {
                dialogHandler.spawnDialog({icon: 'error', title: 'BootSkin Error', text: 'Application could not be started correctly. Missing installation path.', buttons: [['OK', (e) => wm.closeWindow(e.target.closest('app').id)]]});
                return;
            }

            var contents = this._template.content.firstElementChild.cloneNode(true);
            var hWnd = wm.createNewWindow("bootskin", contents);
            selfWindowRef = wm._windows[hWnd];
            
            wm.setIcon(hWnd, options.icon || 'bootskin.png');
            wm.setCaption(hWnd, "BootSkin");
            wm.setSize(hWnd, 350, 400);
            renderSkins();
            selfWindowRef.querySelector('#apply-btn').onclick = applySkin;
            selfWindowRef.querySelector('#edit-btn').onclick = editSelectedSkin;
            selfWindowRef.querySelector('[data-action="new"]').onclick = addNewSkin;
            selfWindowRef.querySelector('[data-action="reset"]').onclick = resetSkins;
            selfWindowRef.querySelector('[data-action="exit"]').onclick = () => wm.closeWindow(hWnd);
            selfWindowRef.querySelector('[data-action="about"]').onclick = () => dialogHandler.spawnDialog({icon: 'info', title: 'About BootSkin', text: 'BootSkin for Reborn XP by Quenq.', buttons: [['OK', (e) => wm.closeWindow(e.target.closest('app').id)]]});
            selfWindowRef.querySelector('[data-action="publish"]').onclick = () => window.open('https://github.com/Quenq-Systems/boot-skin', '_blank');
            selfWindowRef.querySelector('#preview-btn').onclick = showPreview;
            return hWnd;
        }
    });
})();
