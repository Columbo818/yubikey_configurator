#!/usr/bin/env zx

import usbDetect from 'usb-detection';

usbDetect.startMonitoring();

//i2c_display('waiting_for_security_key');

// Specifically looks for PID of Yubico
usbDetect.on('add:4176', async device => {
	if (!device.deviceName.startsWith('YubiKey'))
		return;

	const keysRaw = await $`ykman list`;
	const [key, ...more] = keysRaw.stdout.split('\n').filter(Boolean);

	if (more.length)
        //i2c_display('multiple_keys_detected', { key, more });
        return;

	const matches = key.match(/(.+) Serial: (\d*)/);

	if (!matches)
		//i2c_display('invalid_key_information', { key });

	const { keyType, nfc } = getKeyType(matches[1]);
	const serial = matches[2];

	//i2c_display('key_detected', { keyType, serial });

	const usbConfig = await $`ykman config usb -l`;

	const interfaces = usbConfig.stdout.split('\n').filter(Boolean);

	if (new Set(interfaces).has('OTP')) {
		await $`ykman config usb -d OTP -f`;

		return;
	}

	if (nfc) {
		await $`ykman config nfc -a -f`;
		await $`ykman config nfc -d OTP -f`;
		await $`ykman config nfc -d PIV -f`;
		await $`ykman config nfc -d OPENPGP -f`;
		await $`ykman config nfc -d OATH -f`;
	}
});

function getKeyType(input) {
	switch (true) {
		case input.startsWith('YubiKey 5C NFC'):
			return { keyType: 'yubikey-5c-nfc', nfc: true };
		default:
            //i2c_display('unknown_key_type', { input });
            return;
	}
}
