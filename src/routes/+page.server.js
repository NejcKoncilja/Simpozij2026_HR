import { fail } from '@sveltejs/kit';
import PocketBase from 'pocketbase';

const pb = new PocketBase('https://rest-grown.pockethost.io');

export function load() {
    const datumKrajAkcije = new Date('2026-04-22');
    const danes = new Date();
    const jeAkcijskaCena = danes < datumKrajAkcije;
    return { jeAkcijskaCena };
}

export const actions = {
    default: async ({ request }) => {
        const formData = await request.formData();

        const prijavaVrsta = formData.get('prijavaVrsta') || '';

        const podjetjeNaziv = formData.get('podjetjeNaziv') || '';
        const podjetjeNaslov = formData.get('podjetjeNaslov') || '';
        const podjetjeDavcna = formData.get('podjetjeDavcna') || '';

        if (!podjetjeNaziv || !podjetjeNaslov || !podjetjeDavcna) {
            return fail(400, {
                error: 'Prosimo, izpolnite vsa polja o podjetju (naziv, naslov, davčna).'
            });
        }

        if (prijavaVrsta === 'individualna') {
            const ime = formData.get('udelezenec0_ime') || '';
            const email = formData.get('udelezenec0_email') || '';
            const telefon = formData.get('udelezenec0_telefon') || '';
            const sfd = formData.get('udelezenec0_sfd') ? true : false;

            if (!ime || !email || !telefon) {
                return fail(400, {
                    error: 'Pri individualni prijavi manjkajo ime, email ali telefon.'
                });
            }

            try {
                const record = await pb.collection('HR_individualna').create({
                    Podjetje: podjetjeNaziv,
                    Naslov_sedeza_podjetja: podjetjeNaslov,
                    Davcna_stevilka: podjetjeDavcna,
                    Ime_in_priimek: ime,
                    Elektronski_naslov: email,
                    Telefonska_stevilka: telefon,
                    SFD: sfd
                });
                console.log('Shranili individualno:', record);
            } catch (err) {
                console.error('Napaka PB (individualna):', err);
                const sporocilo = err?.response?.data ? JSON.stringify(err.response.data) : String(err);
                return fail(500, { error: `Napaka PB (individualna): ${sporocilo}` });
            }

            return {
                success: true,
                message: 'Uspešno oddana individualna prijava.'
            };

        } else if (prijavaVrsta === 'skupinska') {
            let i = 0;
            const seznam = [];

            while (true) {
                const ime = formData.get(`udelezenec${i}_ime`);
                if (!ime) {
                    break;
                }
                const email = formData.get(`udelezenec${i}_email`) || '';
                const telefon = formData.get(`udelezenec${i}_telefon`) || '';
                const sfd = formData.get(`udelezenec${i}_sfd`) ? true : false;

                seznam.push({ ime, email, telefon, sfd });
                i++;
            }

            if (seznam.length < 4) {
                return fail(400, {
                    error: 'Skupinska prijava zahteva vsaj 4 udeležence.'
                });
            }

            try {
                for (const ud of seznam) {
                    const zapis = await pb.collection('HR_skupinska').create({
                        Podjetje: podjetjeNaziv,
                        Naslov_sedeza_podjetja: podjetjeNaslov,
                        Davcna_stevilka: podjetjeDavcna,
                        Ime_in_priimek: ud.ime,
                        Elektronski_naslov: ud.email,
                        Telefonska_stevilka: ud.telefon,
                        SFD: ud.sfd
                    });
                    console.log('Shranjeno (skupinska):', zapis);
                }
            } catch (err) {
                console.error('Napaka PB (skupinska):', err);
                const sporocilo = err?.response?.data ? JSON.stringify(err.response.data) : String(err);
                return fail(500, { error: `Napaka PB (skupinska): ${sporocilo}` });
            }

            return {
                success: true,
                message: `Uspešno oddana skupinska prijava. Udeležencev: ${seznam.length}`
            };

        } else {
            return fail(400, {
                error: 'Neznana vrsta prijave.'
            });
        }
    }
};
