import { fail } from '@sveltejs/kit';
import PocketBase from 'pocketbase';

const pb = new PocketBase('https://rest-grown.pockethost.io');
const CENIK_OZNAKA_PODJETJA = '__CENIK__';
const CENIK_EMAIL = 'cenik@gmp.test';
const PRIVZETI_CENIK = {
    akcijskaAktivna: new Date() < new Date('2026-04-22'),
    individualnaRedna: '170',
    individualnaAkcijska: '150',
    skupinskaRedna: '161,5',
    skupinskaAkcijska: '142,5'
};

function preberiVrednostCenika(vrednost, fallback) {
    const niz = String(vrednost ?? '').trim();
    return niz.length > 0 ? niz : fallback;
}

async function preberiCenik() {
    try {
        const zapisi = await pb.collection('SLO_individualna').getFullList({
            sort: '-created',
            requestKey: null
        });

        const cenikZapis = zapisi.find(
            (zapis) =>
                String(zapis.podjetje ?? '').trim() === CENIK_OZNAKA_PODJETJA &&
                String(zapis.elektronski_naslov ?? '').trim() === CENIK_EMAIL
        );

        if (!cenikZapis) {
            return { ...PRIVZETI_CENIK };
        }

        return {
            akcijskaAktivna: Boolean(cenikZapis.sfd),
            individualnaRedna: preberiVrednostCenika(
                cenikZapis.naslov_sedeza_podjetja,
                PRIVZETI_CENIK.individualnaRedna
            ),
            individualnaAkcijska: preberiVrednostCenika(
                cenikZapis.davcna_stevilka,
                PRIVZETI_CENIK.individualnaAkcijska
            ),
            skupinskaRedna: preberiVrednostCenika(
                cenikZapis.ime_in_priimek,
                PRIVZETI_CENIK.skupinskaRedna
            ),
            skupinskaAkcijska: preberiVrednostCenika(
                cenikZapis.telefonska_stevilka,
                PRIVZETI_CENIK.skupinskaAkcijska
            )
        };
    } catch (err) {
        console.error('Napaka pri branju cjenika:', err);
        return { ...PRIVZETI_CENIK };
    }
}

export async function load() {
    return {
        cenik: await preberiCenik()
    };
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

