-- Create health_tips table
CREATE TABLE IF NOT EXISTS health_tips (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    icon VARCHAR(50) NOT NULL,
    color VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security
ALTER TABLE health_tips ENABLE ROW LEVEL SECURITY;

-- Allow public read access (everyone can view health tips)
CREATE POLICY "Public read access to health_tips" ON health_tips
    FOR SELECT
    TO public
    USING (true);

-- Allow authenticated users to read (redundant but explicit)
CREATE POLICY "Authenticated read access to health_tips" ON health_tips
    FOR SELECT
    TO authenticated
    USING (true);

-- Insert 30 health tips
INSERT INTO health_tips (title, content, category, icon, color, is_active, display_order) VALUES
-- Ginecología (6)
('Chequeos ginecológicos anuales', 'Visita a tu ginecólogo al menos una vez al año aunque no tengas síntomas. La detección temprana es clave para tu salud.', 'ginecologia', 'medkit-outline', '#E8467C', TRUE, 1),
('Citología Pap regularmente', 'Realízate la citología (Papanicolaou) cada 1-3 años según la indicación de tu médico. Detecta células anormales a tiempo.', 'ginecologia', 'shield-checkmark-outline', '#E8467C', TRUE, 2),
('Autoexamen de mamas', 'Examina tus senos mensualmente después de tu período. Cualquier nódulo, cambio de forma o secreción debe consultarse de inmediato.', 'ginecologia', 'heart-outline', '#E8467C', TRUE, 3),
('Vacuna contra el VPH', 'La vacuna del Virus del Papiloma Humano protege contra cepas que causan cáncer de cuello uterino. Consulta a tu médico si eres candidata.', 'ginecologia', 'bandage-outline', '#E8467C', TRUE, 4),
('Higiene íntima adecuada', 'Usa jabones de pH neutro para la zona íntima. Evita duchas vaginales internas que alteran la flora natural y aumentan el riesgo de infecciones.', 'ginecologia', 'water-outline', '#E8467C', TRUE, 5),
('Control del ciclo menstrual', 'Registra la regularidad, duración y síntomas de tu ciclo. Irregularidades persistentes pueden señalar condiciones como PCOS o endometriosis.', 'ginecologia', 'calendar-outline', '#E8467C', TRUE, 6),

-- Prenatal (8)
('Ácido fólico desde el inicio', 'Toma 400-800 mcg de ácido fólico diariamente, idealmente antes de concebir y durante el primer trimestre. Previene defectos del tubo neural.', 'prenatal', 'leaf-outline', '#10B981', TRUE, 7),
('Controles prenatales puntuales', 'Asiste a todas tus citas prenatales. En el primer trimestre son mensuales; en el tercero, cada 1-2 semanas. No los saltes.', 'prenatal', 'clipboard-outline', '#10B981', TRUE, 8),
('Movimientos fetales diarios', 'A partir de la semana 28, cuenta los movimientos del bebé. Menos de 10 movimientos en 2 horas es motivo de consulta inmediata.', 'prenatal', 'body-outline', '#10B981', TRUE, 9),
('Posición para dormir en el tercer trimestre', 'Duerme preferiblemente sobre tu lado izquierdo. Mejora el flujo sanguíneo al bebé y reduce la presión sobre la vena cava inferior.', 'prenatal', 'moon-outline', '#10B981', TRUE, 10),
('Evitar medicamentos sin consulta', 'Durante el embarazo, no tomes ningún medicamento —ni vitaminas— sin aprobación de tu obstetra. Muchos fármacos comunes son contraindicados.', 'prenatal', 'alert-circle-outline', '#10B981', TRUE, 11),
('Ecografías en el tiempo correcto', 'La ecografía morfológica a las 20 semanas es fundamental. Detecta malformaciones y verifica el crecimiento adecuado del bebé.', 'prenatal', 'pulse-outline', '#10B981', TRUE, 12),
('Preparación para el parto', 'Asiste a clases de preparto desde la semana 30. Aprenderás técnicas de respiración, posiciones y señales de alerta que te darán tranquilidad.', 'prenatal', 'school-outline', '#10B981', TRUE, 13),
('Señales de alerta en el embarazo', 'Acude de urgencia si presentas sangrado vaginal, dolor abdominal intenso, visión borrosa, hinchazón repentina de cara/manos o fiebre alta.', 'prenatal', 'warning-outline', '#10B981', TRUE, 14),

-- Nutrición (6)
('Hierro para prevenir anemia', 'Consume alimentos ricos en hierro como carnes rojas, legumbres y espinacas. Acompáñalos con vitamina C para mejorar su absorción.', 'nutricion', 'nutrition-outline', '#F59E0B', TRUE, 15),
('Calcio para huesos fuertes', 'El calcio es esencial durante el embarazo y la lactancia. Consume lácteos, almendras, brócoli y sardinas. La dosis recomendada es 1000 mg/día.', 'nutricion', 'fish-outline', '#F59E0B', TRUE, 16),
('Hidratación óptima', 'Bebe entre 8 y 10 vasos de agua al día durante el embarazo. Una buena hidratación reduce las náuseas, el estreñimiento y las contracciones de Braxton Hicks.', 'nutricion', 'water-outline', '#3B82F6', TRUE, 17),
('Alimentos a evitar en el embarazo', 'Evita pescados de alto contenido en mercurio (tiburón, atún), quesos no pasteurizados, embutidos crudos y huevos crudos. Aumentan el riesgo de infecciones.', 'nutricion', 'close-circle-outline', '#F59E0B', TRUE, 18),
('Omega-3 para el desarrollo cerebral', 'Los ácidos grasos Omega-3 favorecen el desarrollo cerebral del bebé. Consume salmón, nueces, chía y linaza. Consulta suplementos con tu médico.', 'nutricion', 'sparkles-outline', '#F59E0B', TRUE, 19),
('Come en porciones pequeñas y frecuentes', 'Divide tus comidas en 5-6 porciones pequeñas al día. Reduce las náuseas matutinas, mejora la digestión y mantiene estable tu nivel de glucosa.', 'nutricion', 'restaurant-outline', '#F59E0B', TRUE, 20),

-- Ejercicio (5)
('Caminar 30 minutos al día', 'Caminar es el ejercicio más seguro durante el embarazo. Mejora la circulación, reduce el dolor de espalda y prepara el cuerpo para el parto.', 'ejercicio', 'walk-outline', '#8B5CF6', TRUE, 21),
('Ejercicios de Kegel', 'Fortalecer el suelo pélvico con ejercicios de Kegel facilita el parto y acelera la recuperación postparto. Practica 10 repeticiones, 3 veces al día.', 'ejercicio', 'fitness-outline', '#8B5CF6', TRUE, 22),
('Yoga prenatal', 'El yoga prenatal mejora la flexibilidad, reduce el estrés y alivia dolores musculares. Busca clases especializadas para embarazadas a partir del segundo trimestre.', 'ejercicio', 'body-outline', '#8B5CF6', TRUE, 23),
('Natación en el embarazo', 'Nadar es ideal: el agua sostiene el peso del bebé, alivia el dolor de espalda y mantiene el corazón activo sin impacto sobre las articulaciones.', 'ejercicio', 'water-outline', '#8B5CF6', TRUE, 24),
('Evita ejercicios de alto impacto', 'Evita deportes de contacto, actividades con riesgo de caída o ejercicios con presión abdominal intensa. Consulta siempre con tu médico antes de iniciar.', 'ejercicio', 'alert-outline', '#8B5CF6', TRUE, 25),

-- Salud mental (5)
('La depresión postparto es real', 'Si después del parto sientes tristeza persistente, llanto sin razón o desconexión con tu bebé más de 2 semanas, busca ayuda profesional. No estás sola.', 'mental', 'heart-half-outline', '#EC4899', TRUE, 26),
('Gestiona el estrés prenatal', 'El estrés elevado durante el embarazo puede afectar al bebé. Practica respiración profunda, meditación o simplemente descansa. Tu calma es su calma.', 'mental', 'sunny-outline', '#EC4899', TRUE, 27),
('Red de apoyo es fundamental', 'Rodéate de personas que te apoyen durante el embarazo y la crianza. Compartir experiencias con otras mamás reduce la ansiedad y el sentimiento de soledad.', 'mental', 'people-outline', '#EC4899', TRUE, 28),
('Duerme y descansa cuando puedas', 'El descanso es medicina. En el embarazo y postparto, acepta ayuda, delega tareas y duerme cuando el bebé duerme. Tu cuerpo necesita recuperarse.', 'mental', 'moon-outline', '#EC4899', TRUE, 29),
('Habla sobre tus emociones', 'Expresar miedos y preocupaciones con tu pareja, familia o profesional de salud mental reduce la carga emocional y fortalece el vínculo con tu bebé.', 'mental', 'chatbubble-ellipses-outline', '#EC4899', TRUE, 30);
