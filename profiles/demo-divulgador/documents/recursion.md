# ¿Qué es la recursión?

Pará un segundo y pensá en dos espejos enfrentados. Te parás en el medio y ves
una imagen, dentro de esa imagen otra, y dentro de esa otra más, hacia el
infinito. Bueno: la recursión es eso, pero en código. Una función que, para
resolver su problema, se llama a sí misma con una versión más chica del mismo
problema.

Vamos despacio, que esto se entiende mejor de a un escalón por vez.

Primero, lo importante no es "que se llame a sí misma". Eso es la parte vistosa.
Lo importante son DOS cosas que toda recursión necesita sí o sí. La primera es el
caso base: el momento en que el problema ya es tan chico que la respuesta es
obvia y no hace falta seguir. Sin caso base, los espejos no terminan nunca y el
programa se cae. La segunda es el paso recursivo: cómo achicás el problema para
acercarte al caso base.

Pensalo como bajar una escalera con los ojos cerrados. El paso recursivo es
"bajá un escalón". El caso base es "si tocás el piso, frená". Si te falta el
"frená", seguís pisando para abajo aunque ya no haya escalera.

Y acá viene el aha: vos no tenés que imaginarte TODA la escalera de una. Solo
tenés que saber resolver UN escalón y reconocer el piso. La función confía en
que la versión más chica de sí misma va a resolver el resto. Esa confianza es
todo el truco.

Recursión es resolver un problema grande prometiendo que ya sabés resolver el
mismo problema, pero un poquito más chico.
