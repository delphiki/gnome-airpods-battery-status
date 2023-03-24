/**
 * Created by Julien "delphiki" Villetorte (delphiki@protonmail.com)
 */
const Main = imports.ui.main;
const { Clutter, GLib, St, Gio } = imports.gi;
const ByteArray = imports.byteArray;
const Mainloop = imports.mainloop;
const PanelMenu = imports.ui.panelMenu;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const PopupMenu = imports.ui.popupMenu;


let batteryStatus;
let statusFilePath = '/tmp/airstatus.out';
let cacheTTL = 3600;

class AipodsBatteryStatus {
    constructor(filePath) {
        this._statusFilePath = filePath;
        this._panelMenuButton = null;

        this._timer = null;
        this._currentStatusValue = {};
        this._cache = {
            leftUpdatedAt: null,
            rightUpdatedAt: null,
            caseUpdatedAt: null,
            modelUpdatedAt: null,
            leftChargingUpdatedAt: null,
            rightChargingUpdatedAt: null,
            caseChargingUpdatedAt: null,
        };
        this._leftAirpodLabel = null;
        this._rightAirpodLabel = null;
        this._icon = null;
        this._caseLabel = null;
        this._caseIcon = null;


        this._subMenuModelItem = null;
        this._subMenuModelItemLabel = null;

        this._subMenuLeftChargingItem = null;
        this._subMenuRightChargingItem = null;
        this._subMenuCaseChargingItem = null;

        this.buildLayout();

        this.updateBatteryStatus();
    }

    getCurrentStatus() {
        Log("getCurrentStatus");

        if (!GLib.file_test(this._statusFilePath, GLib.FileTest.EXISTS)) {
            return {};
        }

        let fileContents = GLib.file_get_contents(this._statusFilePath)[1];

        let lines;
        if (fileContents instanceof Uint8Array) {
            lines = ByteArray.toString(fileContents).trim().split('\n');
        } else {
            lines = fileContents.toString().trim().split('\n');
        }

        let lastLine = lines[lines.length - 1];

        return lastLine.length > 0 ? JSON.parse(lastLine) : {};
    }

    updateBatteryStatus() {
        Log("updateBatteryStatus");

        this._currentStatusValue = this.getCurrentStatus();

        let charge = this._currentStatusValue.hasOwnProperty("charge") ? this._currentStatusValue.charge : {};
        let statusDate = this._currentStatusValue.hasOwnProperty('date') ? Date.parse(this._currentStatusValue.date) : null;
        let now = Date.now();
        let cacheLimitDate = now - (cacheTTL * 1000);
        let statusTooOld = statusDate < cacheLimitDate;

        ['left', 'right'].forEach((chargeable) => {
            if (!statusTooOld && charge.hasOwnProperty(chargeable) && charge[chargeable] !== -1) {
                this['_'+chargeable+'AirpodLabel'].set_text(charge[chargeable]+' %');
                this._cache[chargeable+'UpdatedAt'] = statusDate;
            } else if (
                this._cache[chargeable+'UpdatedAt'] === null
                || this._cache[chargeable+'UpdatedAt'] < cacheLimitDate
            ) {
                this['_'+chargeable+'AirpodLabel'].set_text('...');
            }
        });

        if (!statusTooOld && charge.hasOwnProperty('case') && charge.case !== -1) {
            this._caseLabel.set_text(charge.case+' %');
            this._cache.caseUpdatedAt = statusDate;
            this._caseLabel.show()
            this._caseIcon.show();
        } else if (
            statusTooOld
            || this._cache.caseUpdatedAt === null
            || this._cache.caseUpdatedAt < cacheLimitDate
        ) {
            this._caseLabel.hide()
            this._caseIcon.hide();
        }

        if (!statusTooOld && this._currentStatusValue.hasOwnProperty('model')) {
            this._subMenuModelItemLabel.set_text(this._currentStatusValue.model.split(/(?=[A-Z0-9])/).join(' '));
        } else if (
                statusTooOld
                || this._cache.modelUpdatedAt === null
                || this._cache.modelUpdatedAt < cacheLimitDate
                ) {
            this._subMenuModelItemLabel.set_text('no Airpods detected');
        }

        ['case', 'left', 'right'].forEach((chargeable) => {
            if (!statusTooOld && this._currentStatusValue.hasOwnProperty('charging_'+chargeable)) {
                this['_subMenu'+this.capitalize(chargeable)+'ChargingItem'].label.text = this.capitalize(chargeable)+': '
                    +(this._currentStatusValue['charging_'+chargeable] ? 'charging' : 'not charging')
                    +(charge[chargeable] !== -1 ? ' ('+charge[chargeable]+' %)' : '')
                ;
                this['_subMenu'+this.capitalize(chargeable)+'ChargingItem'].setIcon(this.getBatteryIcon(
                    charge[chargeable],
                    this._currentStatusValue['charging_'+chargeable]
                ));
            } else {
                this['_subMenu'+this.capitalize(chargeable)+'ChargingItem'].label.text = this.capitalize(chargeable)+': N/A';
            }
        });

        return true;
    }

    buildLayout() {
        Log("buildLayout");

        let box = new St.BoxLayout();

        this._leftAirpodLabel = new St.Label({
            text: '...',
            y_align: Clutter.ActorAlign.CENTER,
            style_class: "left-airpod-label"
        });

        this._icon = new St.Icon({
            gicon: Gio.icon_new_for_string(Me.path + '/airpods.svg'),
            style_class: "system-status-icon",
        });

        this._rightAirpodLabel = new St.Label({
            text: '...',
            y_align: Clutter.ActorAlign.CENTER,
            style_class: "right-airpod-label"
        });

        this._caseIcon = new St.Icon({
            gicon: Gio.icon_new_for_string(Me.path + '/case.svg'),
            style_class: "system-status-icon",
        });

        this._caseLabel = new St.Label({
            text: '...',
            y_align: Clutter.ActorAlign.CENTER,
            style_class: "right-airpod-label"
        });

        box.add(this._leftAirpodLabel)
        box.add(this._icon);
        box.add(this._rightAirpodLabel);
        box.add(this._caseIcon);
        box.add(this._caseLabel);

        this._panelMenuButton = new PanelMenu.Button(0.5, 'AirpodsBatteryStatusPopup', false);

        this._panelMenuButton.add_child(box);

        this._subMenuModelItem = new PopupMenu.PopupMenuItem('Model: ');
        this._subMenuModelItemLabel = new St.Label({ text : 'no Airpods detected' });
        this._subMenuModelItem.add_child(this._subMenuModelItemLabel);

        this._subMenuCaseChargingItem = new PopupMenu.PopupImageMenuItem('Case: not charging', 'battery-missing');
        this._subMenuLeftChargingItem = new PopupMenu.PopupImageMenuItem('Left pod: not charging', 'battery-missing');
        this._subMenuRightChargingItem = new PopupMenu.PopupImageMenuItem('Right pod: not charging', 'battery-missing');

        this._panelMenuButton.menu.addMenuItem(this._subMenuModelItem);
        this._panelMenuButton.menu.addMenuItem(this._subMenuCaseChargingItem);
        this._panelMenuButton.menu.addMenuItem(this._subMenuLeftChargingItem);
        this._panelMenuButton.menu.addMenuItem(this._subMenuRightChargingItem);

        Main.panel.addToStatusArea("AirpodsBatteryStatus", this._panelMenuButton, 1);
    }

    getBatteryIcon(percentage, charging) {
        let iconName = 'battery-';
        switch (true) {
            case percentage < 0:
                return 'battery-missing';
            case percentage <= 10:
                iconName += 'caution';
                break;
            case percentage <= 40:
                iconName += 'low';
                break;
            case percentage <= 70:
                iconName += 'good';
                break;
            case percentage <= 100:
                iconName += 'full';
                break;
            default:
                return 'battery-missing';
        }

        return iconName + (charging ? '-charging' : '');
    }

    capitalize(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    enable() {
        Log("enable");
        this.updateBatteryStatus();

        this._timer = Mainloop.timeout_add_seconds(10, () => {
            this.updateBatteryStatus();
            return GLib.SOURCE_CONTINUE;
        });
    }

    disable() {
        Log("disable");

        this._panelMenuButton.destroy();
        Main.panel.statusArea["AirpodsBatteryStatus"] = null;

        if (this._timer) {
            Mainloop.source_remove(this._timer);
            this._timer = null;
        }
    }
}

function enable() {
    batteryStatus = new AipodsBatteryStatus(statusFilePath);
    Main.panel.statusArea["AirpodsBatteryStatus"] = null;

    batteryStatus.enable();
}

function disable() {
    batteryStatus.disable();
    batteryStatus = null;
}

let Log = function(msg) {
    log("[Airpods Battery Status] " + msg);
}
