/**
 * Created by Julien "delphiki" Villetorte (delphiki@protonmail.com)
 */
const Main = imports.ui.main;
const { Clutter, GLib, St, Gio } = imports.gi;
const ByteArray = imports.byteArray;
const Mainloop = imports.mainloop;
const Me = imports.misc.extensionUtils.getCurrentExtension();

let box = new St.BoxLayout();
let aggregateMenu;
let powerIndicator;
let statusFilePath = '/tmp/airstatus.out';
let currentStatusValue;
let leftAirpodLabel;
let rightAirpodLabel;
let icon;
let caseLabel;
let caseIcon;

let loop;

function getCurrentStatus() {
	let fileContents = GLib.file_get_contents(statusFilePath)[1];

	let lines;
	if (fileContents instanceof Uint8Array) {
		lines = ByteArray.toString(fileContents).trim().split('\n');
	} else {
		lines = fileContents.toString().trim().split('\n');
	}

	let lastLine = lines[lines.length - 1];

	return lastLine.length > 0 ? JSON.parse(lastLine) : {};
}

function updateBatteryStatus() {
	currentStatusValue = getCurrentStatus();

	let charge = currentStatusValue.hasOwnProperty("charge") ? currentStatusValue.charge : {};

	if (charge.left !== -1) {
		leftAirpodLabel.set_text(charge.left+' %');
	} else {
		leftAirpodLabel.set_text('- %');
	}
	if (charge.right !== -1) {
		rightAirpodLabel.set_text(charge.right+' %');
	} else {
		rightAirpodLabel.set_text('- %');
	}

	if (charge.case !== -1) {
		caseLabel.set_text(charge.case+' %');
		caseLabel.show()
		caseIcon.show();
	} else {
		caseLabel.hide()
		caseIcon.hide();
	}

	return true;
}

function init() {
	aggregateMenu = Main.panel.statusArea["aggregateMenu"];
	powerIndicator = aggregateMenu._power;

	leftAirpodLabel = new St.Label({
		text: '- %',
		y_align: Clutter.ActorAlign.CENTER,
		style_class: "left-airpod-label"
	});

	icon = new St.Icon({
		gicon: Gio.icon_new_for_string(Me.path + '/airpods.svg'),
		style_class: "system-status-icon",
	});

	rightAirpodLabel = new St.Label({
		text: '- %',
		y_align: Clutter.ActorAlign.CENTER,
		style_class: "right-airpod-label"
	});

	caseIcon = new St.Icon({
		gicon: Gio.icon_new_for_string(Me.path + '/case.svg'),
		style_class: "system-status-icon",
	});

	caseLabel = new St.Label({
		text: '- %',
		y_align: Clutter.ActorAlign.CENTER,
		style_class: "right-airpod-label"
	});

	box.add(leftAirpodLabel)
	box.add(icon);
	box.add(rightAirpodLabel);
	box.add(caseIcon);
	box.add(caseLabel);
}

function enable() {
	powerIndicator.insert_child_at_index(box, 0);
	loop = Mainloop.timeout_add(5000, updateBatteryStatus);
}

function disable() {
	powerIndicator.remove_child(box);
}


let Log = function(msg) {
	log("[Airpods Battery Status] " + msg);
}
