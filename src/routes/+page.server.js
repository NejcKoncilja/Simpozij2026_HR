import { fail } from '@sveltejs/kit';
import PocketBase from 'pocketbase';

const pb = new PocketBase('https://rest-grown.pockethost.io');

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
            const prevoz = formData.get('udelezenec0_prevoz') ? true : false;
            const sfd = formData.get('udelezenec0_sfd') ? true : false;

            if (!ime || !email || !telefon) {
                return fail(400, {
                    error: 'Pri individualni prijavi manjkajo ime, email ali telefon.'
                });
            }

            try {
                const record = await pb.collection('GMP_Individualna').create({
                    Podjetje: podjetjeNaziv,
                    Naslov_sedeza_podjetja: podjetjeNaslov,
                    Davcna_stevilka: podjetjeDavcna,
                    Ime_in_priimek: ime,
                    Elektronski_naslov: email,
                    Telefonska_stevilka: telefon,
                    Prevoz: prevoz,
                    SFD: sfd
                });
                console.log('Shranili individualno:', record);
            } catch (err) {
                console.error('Napaka PB (individualna):', err);
                return fail(500, { error: 'Ni uspelo shraniti (individualna) v PB.' });
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
                const prevoz = formData.get(`udelezenec${i}_prevoz`) ? true : false;
                const sfd = formData.get(`udelezenec${i}_sfd`) ? true : false;

                seznam.push({ ime, email, telefon, prevoz, sfd });
                i++;
            }

            if (seznam.length < 4) {
                return fail(400, {
                    error: 'Skupinska prijava zahteva vsaj 4 udeležence.'
                });
            }

            try {
                for (const ud of seznam) {
                    const zapis = await pb.collection('GMP_Skupinska').create({
                        Podjetje: podjetjeNaziv,
                        Naslov_sedeza_podjetja: podjetjeNaslov,
                        Davcna_stevilka: podjetjeDavcna,
                        Ime_in_priimek: ud.ime,
                        Elektronski_naslov: ud.email,
                        Telefonska_stevilka: ud.telefon,
                        Prevoz: ud.prevoz,
                        SFD: ud.sfd
                    });
                    console.log('Shranjeno (skupinska):', zapis);
                }
            } catch (err) {
                console.error('Napaka PB (skupinska):', err);
                return fail(500, { error: 'Ni uspelo shraniti (skupinska) v PB.' });
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
