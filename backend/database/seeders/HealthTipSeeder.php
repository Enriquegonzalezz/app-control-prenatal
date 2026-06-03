<?php

namespace Database\Seeders;

use App\Models\HealthTip;
use Illuminate\Database\Seeder;

class HealthTipSeeder extends Seeder
{
    public function run(): void
    {
        $tips = [
            // ── Ginecología (6) ─────────────────────────────────────────
            [
                'title'         => 'Chequeos ginecológicos anuales',
                'content'       => 'Visita a tu ginecólogo al menos una vez al año aunque no tengas síntomas. La detección temprana es clave para tu salud.',
                'category'      => 'ginecologia',
                'icon'          => 'medkit-outline',
                'color'         => '#E8467C',
                'display_order' => 1,
            ],
            [
                'title'         => 'Citología Pap regularmente',
                'content'       => 'Realízate la citología (Papanicolaou) cada 1-3 años según la indicación de tu médico. Detecta células anormales a tiempo.',
                'category'      => 'ginecologia',
                'icon'          => 'shield-checkmark-outline',
                'color'         => '#E8467C',
                'display_order' => 2,
            ],
            [
                'title'         => 'Autoexamen de mamas',
                'content'       => 'Examina tus senos mensualmente después de tu período. Cualquier nódulo, cambio de forma o secreción debe consultarse de inmediato.',
                'category'      => 'ginecologia',
                'icon'          => 'heart-outline',
                'color'         => '#E8467C',
                'display_order' => 3,
            ],
            [
                'title'         => 'Vacuna contra el VPH',
                'content'       => 'La vacuna del Virus del Papiloma Humano protege contra cepas que causan cáncer de cuello uterino. Consulta a tu médico si eres candidata.',
                'category'      => 'ginecologia',
                'icon'          => 'bandage-outline',
                'color'         => '#E8467C',
                'display_order' => 4,
            ],
            [
                'title'         => 'Higiene íntima adecuada',
                'content'       => 'Usa jabones de pH neutro para la zona íntima. Evita duchas vaginales internas que alteran la flora natural y aumentan el riesgo de infecciones.',
                'category'      => 'ginecologia',
                'icon'          => 'water-outline',
                'color'         => '#E8467C',
                'display_order' => 5,
            ],
            [
                'title'         => 'Control del ciclo menstrual',
                'content'       => 'Registra la regularidad, duración y síntomas de tu ciclo. Irregularidades persistentes pueden señalar condiciones como PCOS o endometriosis.',
                'category'      => 'ginecologia',
                'icon'          => 'calendar-outline',
                'color'         => '#E8467C',
                'display_order' => 6,
            ],

            // ── Prenatal (8) ─────────────────────────────────────────────
            [
                'title'         => 'Ácido fólico desde el inicio',
                'content'       => 'Toma 400-800 mcg de ácido fólico diariamente, idealmente antes de concebir y durante el primer trimestre. Previene defectos del tubo neural.',
                'category'      => 'prenatal',
                'icon'          => 'leaf-outline',
                'color'         => '#10B981',
                'display_order' => 7,
            ],
            [
                'title'         => 'Controles prenatales puntuales',
                'content'       => 'Asiste a todas tus citas prenatales. En el primer trimestre son mensuales; en el tercero, cada 1-2 semanas. No los saltes.',
                'category'      => 'prenatal',
                'icon'          => 'clipboard-outline',
                'color'         => '#10B981',
                'display_order' => 8,
            ],
            [
                'title'         => 'Movimientos fetales diarios',
                'content'       => 'A partir de la semana 28, cuenta los movimientos del bebé. Menos de 10 movimientos en 2 horas es motivo de consulta inmediata.',
                'category'      => 'prenatal',
                'icon'          => 'body-outline',
                'color'         => '#10B981',
                'display_order' => 9,
            ],
            [
                'title'         => 'Posición para dormir en el tercer trimestre',
                'content'       => 'Duerme preferiblemente sobre tu lado izquierdo. Mejora el flujo sanguíneo al bebé y reduce la presión sobre la vena cava inferior.',
                'category'      => 'prenatal',
                'icon'          => 'moon-outline',
                'color'         => '#10B981',
                'display_order' => 10,
            ],
            [
                'title'         => 'Evitar medicamentos sin consulta',
                'content'       => 'Durante el embarazo, no tomes ningún medicamento —ni vitaminas— sin aprobación de tu obstetra. Muchos fármacos comunes son contraindicados.',
                'category'      => 'prenatal',
                'icon'          => 'alert-circle-outline',
                'color'         => '#10B981',
                'display_order' => 11,
            ],
            [
                'title'         => 'Ecografías en el tiempo correcto',
                'content'       => 'La ecografía morfológica a las 20 semanas es fundamental. Detecta malformaciones y verifica el crecimiento adecuado del bebé.',
                'category'      => 'prenatal',
                'icon'          => 'pulse-outline',
                'color'         => '#10B981',
                'display_order' => 12,
            ],
            [
                'title'         => 'Preparación para el parto',
                'content'       => 'Asiste a clases de preparto desde la semana 30. Aprenderás técnicas de respiración, posiciones y señales de alerta que te darán tranquilidad.',
                'category'      => 'prenatal',
                'icon'          => 'school-outline',
                'color'         => '#10B981',
                'display_order' => 13,
            ],
            [
                'title'         => 'Señales de alerta en el embarazo',
                'content'       => 'Acude de urgencia si presentas sangrado vaginal, dolor abdominal intenso, visión borrosa, hinchazón repentina de cara/manos o fiebre alta.',
                'category'      => 'prenatal',
                'icon'          => 'warning-outline',
                'color'         => '#10B981',
                'display_order' => 14,
            ],

            // ── Nutrición (6) ─────────────────────────────────────────────
            [
                'title'         => 'Hierro para prevenir anemia',
                'content'       => 'Consume alimentos ricos en hierro como carnes rojas, legumbres y espinacas. Acompáñalos con vitamina C para mejorar su absorción.',
                'category'      => 'nutricion',
                'icon'          => 'nutrition-outline',
                'color'         => '#F59E0B',
                'display_order' => 15,
            ],
            [
                'title'         => 'Calcio para huesos fuertes',
                'content'       => 'El calcio es esencial durante el embarazo y la lactancia. Consume lácteos, almendras, brócoli y sardinas. La dosis recomendada es 1000 mg/día.',
                'category'      => 'nutricion',
                'icon'          => 'fish-outline',
                'color'         => '#F59E0B',
                'display_order' => 16,
            ],
            [
                'title'         => 'Hidratación óptima',
                'content'       => 'Bebe entre 8 y 10 vasos de agua al día durante el embarazo. Una buena hidratación reduce las náuseas, el estreñimiento y las contracciones de Braxton Hicks.',
                'category'      => 'nutricion',
                'icon'          => 'water-outline',
                'color'         => '#3B82F6',
                'display_order' => 17,
            ],
            [
                'title'         => 'Alimentos a evitar en el embarazo',
                'content'       => 'Evita pescados de alto contenido en mercurio (tiburón, atún), quesos no pasteurizados, embutidos crudos y huevos crudos. Aumentan el riesgo de infecciones.',
                'category'      => 'nutricion',
                'icon'          => 'close-circle-outline',
                'color'         => '#F59E0B',
                'display_order' => 18,
            ],
            [
                'title'         => 'Omega-3 para el desarrollo cerebral',
                'content'       => 'Los ácidos grasos Omega-3 favorecen el desarrollo cerebral del bebé. Consume salmón, nueces, chía y linaza. Consulta suplementos con tu médico.',
                'category'      => 'nutricion',
                'icon'          => 'sparkles-outline',
                'color'         => '#F59E0B',
                'display_order' => 19,
            ],
            [
                'title'         => 'Come en porciones pequeñas y frecuentes',
                'content'       => 'Divide tus comidas en 5-6 porciones pequeñas al día. Reduce las náuseas matutinas, mejora la digestión y mantiene estable tu nivel de glucosa.',
                'category'      => 'nutricion',
                'icon'          => 'restaurant-outline',
                'color'         => '#F59E0B',
                'display_order' => 20,
            ],

            // ── Ejercicio (5) ─────────────────────────────────────────────
            [
                'title'         => 'Caminar 30 minutos al día',
                'content'       => 'Caminar es el ejercicio más seguro durante el embarazo. Mejora la circulación, reduce el dolor de espalda y prepara el cuerpo para el parto.',
                'category'      => 'ejercicio',
                'icon'          => 'walk-outline',
                'color'         => '#8B5CF6',
                'display_order' => 21,
            ],
            [
                'title'         => 'Ejercicios de Kegel',
                'content'       => 'Fortalecer el suelo pélvico con ejercicios de Kegel facilita el parto y acelera la recuperación postparto. Practica 10 repeticiones, 3 veces al día.',
                'category'      => 'ejercicio',
                'icon'          => 'fitness-outline',
                'color'         => '#8B5CF6',
                'display_order' => 22,
            ],
            [
                'title'         => 'Yoga prenatal',
                'content'       => 'El yoga prenatal mejora la flexibilidad, reduce el estrés y alivia dolores musculares. Busca clases especializadas para embarazadas a partir del segundo trimestre.',
                'category'      => 'ejercicio',
                'icon'          => 'body-outline',
                'color'         => '#8B5CF6',
                'display_order' => 23,
            ],
            [
                'title'         => 'Natación en el embarazo',
                'content'       => 'Nadar es ideal: el agua sostiene el peso del bebé, alivia el dolor de espalda y mantiene el corazón activo sin impacto sobre las articulaciones.',
                'category'      => 'ejercicio',
                'icon'          => 'water-outline',
                'color'         => '#8B5CF6',
                'display_order' => 24,
            ],
            [
                'title'         => 'Evita ejercicios de alto impacto',
                'content'       => 'Evita deportes de contacto, actividades con riesgo de caída o ejercicios con presión abdominal intensa. Consulta siempre con tu médico antes de iniciar.',
                'category'      => 'ejercicio',
                'icon'          => 'alert-outline',
                'color'         => '#8B5CF6',
                'display_order' => 25,
            ],

            // ── Salud mental (5) ─────────────────────────────────────────
            [
                'title'         => 'La depresión postparto es real',
                'content'       => 'Si después del parto sientes tristeza persistente, llanto sin razón o desconexión con tu bebé más de 2 semanas, busca ayuda profesional. No estás sola.',
                'category'      => 'mental',
                'icon'          => 'heart-half-outline',
                'color'         => '#EC4899',
                'display_order' => 26,
            ],
            [
                'title'         => 'Gestiona el estrés prenatal',
                'content'       => 'El estrés elevado durante el embarazo puede afectar al bebé. Practica respiración profunda, meditación o simplemente descansa. Tu calma es su calma.',
                'category'      => 'mental',
                'icon'          => 'sunny-outline',
                'color'         => '#EC4899',
                'display_order' => 27,
            ],
            [
                'title'         => 'Red de apoyo es fundamental',
                'content'       => 'Rodéate de personas que te apoyen durante el embarazo y la crianza. Compartir experiencias con otras mamás reduce la ansiedad y el sentimiento de soledad.',
                'category'      => 'mental',
                'icon'          => 'people-outline',
                'color'         => '#EC4899',
                'display_order' => 28,
            ],
            [
                'title'         => 'Duerme y descansa cuando puedas',
                'content'       => 'El descanso es medicina. En el embarazo y postparto, acepta ayuda, delega tareas y duerme cuando el bebé duerme. Tu cuerpo necesita recuperarse.',
                'category'      => 'mental',
                'icon'          => 'moon-outline',
                'color'         => '#EC4899',
                'display_order' => 29,
            ],
            [
                'title'         => 'Habla sobre tus emociones',
                'content'       => 'Expresar miedos y preocupaciones con tu pareja, familia o profesional de salud mental reduce la carga emocional y fortalece el vínculo con tu bebé.',
                'category'      => 'mental',
                'icon'          => 'chatbubble-ellipses-outline',
                'color'         => '#EC4899',
                'display_order' => 30,
            ],
        ];

        foreach ($tips as $tip) {
            HealthTip::firstOrCreate(
                ['title' => $tip['title']],
                $tip
            );
        }
    }
}
