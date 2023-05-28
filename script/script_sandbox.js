//Наработки. Учимся создавать GraphQl запросы
//общая функция

function getGQL(url) {
  return async function gql(query, variables = {}) {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({query, variables}),
    }
    console.log(JSON.stringify({query, variables}))

    const response = await fetch(url, options)
    const data = await response.json()

    // if (data.errors) {
    //   throw new Error(data.errors[0].message)
    // }

    return Object.values(data)[0] //  gql был без лишних оберток, из data извлекается первое значение как бы не назывался ключ;
  }
}

gqlFunc = getGQL('http://shop-roles.node.ed.asmer.org.ua/graphql')

// ********************* Запрос на список корневых категорий ******************

//Используем CategoryFind, однако в параметре query используем поиск по полю parent, которое должно быть равно null. (у корневых категорий нет родителя)

const rootCategories = {q: '[{"parent":null}]'}

const queryRootCategories = `
  query rootCategories($q: String){ 
    CategoryFind(query: $q){
        _id name 
    }
  }
  `
gqlFunc(queryRootCategories, rootCategories).then(data => console.log(data))

// *********************  Запрос для получения одной категории с товарами и картинками ******************
// Используем CategoryFindOne, передав _id. Попросите GraphQL прислать вам товары из этой категории, а так же подкатегории. Параметр: _id
//  "_id": "64031651d5e3301cba63a54c",
//  "name": "Food" -> пример категории с id
//let id = {id: '64031651d5e3301cba63a54c'} //передаем Food, как для примера

let idCategory = {q: '[{"_id":"64031651d5e3301cba63a54c"}]'}

const queryCategoryWithGoods = `
  query oneCatWithGoods($q: String){
    CategoryFindOne(query: $q){
        _id name goods {
          _id name price images {
            url
          }

        }
    }
  }
  `

gqlFunc(queryCategoryWithGoods, idCategory).then(data => console.log(data))

// *********************  Запрос на получение товара с описанием и картинками ******************
// Аналогично предыдущему запросу, но используем GoodFindOne, так же по _id. Параметр: _id
//_id: '64063ab9d5e3301cba63a5a2', name: 'Угорь Унаги Жареный'

let idGood = {q: '[{"_id":"64063ab9d5e3301cba63a5a2"}]'} // -> потом передавать в idGood нужный id (64063ab9d5e3301cba63a5a2)

const queryGood = `
query goodWithDescription ($q: String) {
  GoodFindOne (query: $q) {
    _id name description price images {
      url
    }
  }
}
`
gqlFunc(queryGood, idGood).then(data => console.log(data))
