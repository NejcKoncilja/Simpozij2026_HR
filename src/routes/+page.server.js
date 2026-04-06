import { fail } from '@sveltejs/kit';
import PocketBase from 'pocketbase';

const pb = new PocketBase('https://rest-grown.pockethost.io');

export async function load() {
    const pbCenik = new PocketBase('https://rest-grown.pockethost.io');

    let jeAkcijskaCena = false;
    let akcijskaIndividualna = 150;
    let akcijskaSkupinska = 142.5;

    try {
        const zapisi = await pbCenik.collection('Cenik').getFullList({ requestKey: null });
        if (zapisi.length > 0) {
            const cenik = zapisi[0];
            jeAkcijskaCena = Boolean(cenik.Akcijska_cena_HR);
            akcijskaIndividualna = Number(cenik.Individualna_popust_HR);
            akcijskaSkupinska = Number(cenik.Skupinska_popust_HR);
        }
    } catch (err) {
        const datumKrajAkcije = new Date('2026-04-22');
        const danes = new Date();
        jeAkcijskaCena = danes < datumKrajAkcije;
    }

    return { jeAkcijskaCena, akcijskaIndividualna, akcijskaSkupinska };
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
                const email = (formData.get(`udelezenec${i}_email`) || '').trim();
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

            for (const [index, ud] of seznam.entries()) {
                if (!ud.ime || !ud.email || !ud.telefon) {
                    return fail(400, {
                        error: `Sudionik #${index + 1}: nedostaju ime, email ili telefon.`
                    });
                }
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(ud.email)) {
                    return fail(400, {
                        error: `Sudionik #${index + 1}: nevažeći email "${ud.email}".`
                    });
                }
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
