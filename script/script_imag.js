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

    if (Object.keys(JSON.parse(localStorage.authToken)).length) {
      options.headers.Authorization = 'Bearer ' + JSON.parse(localStorage.authToken).token
      //alert(options.headers.Authorization)
    }
    //alert(JSON.parse(options))

    const response = await fetch(url, options)
    const data = await response.json()

    if (data.errors) {
      alert(data.errors[0].message)
      throw new Error(JSON.stringify(data.errors))
    }
    return Object.values(data)[0] //  gql был без лишних оберток, из data извлекается первое значение как бы не назывался ключ;
  }
}

let gqlFunc = getGQL('http://shop-roles.node.ed.asmer.org.ua/graphql')

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

// *********************  Запрос для получения одной категории с товарами и картинками ******************
// Используем CategoryFindOne, передав _id. Попросите GraphQL прислать вам товары из этой категории, а так же подкатегории. Параметр: _id
//  "_id": "64031651d5e3301cba63a54c",
//  "name": "Food" -> пример категории с id
//let id = {id: '64031651d5e3301cba63a54c'} //передаем Food, как для примера

//let idCategory = {q: '[{"_id":"64031651d5e3301cba63a54c"}]'}

const queryCategoryWithGoods = `
  query oneCatWithGoods($q: String){
    CategoryFindOne(query: $q){
        _id name subCategories {
          _id name
        }
         goods {
          _id name price images {
            url
          }

        }
    }
  }
  `
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
// *********************  Запрос на регистрацию пользователя  *****
const registration = `
mutation reg($login: String, $password: String) {
       UserUpsert(user: { login: $login, password: $password }) {
         _id login createdAt
       }
     }`

//*********************  Запрос оформления заказа  *****

const orderUpsert = `mutation order ($goods: [OrderGoodInput]) {
      OrderUpsert(order: { orderGoods: $goods }) {
        _id
        createdAt
        total
       }
    }
    `
//*********************  Запрос истории заказов  *****

const orderFind = ` query orders ($q: String) {
  OrderFind (query: $q) {
    _id createdAt orderGoods{
       count good {
        name price
       }
    }
  }
}
`

//запросы к бэкэнду на выборки данных
// gqlFunc(queryRootCategories, rootCategories).then(data => console.log(data))
// gqlFunc(queryCategoryWithGoods, idCategory).then(data => console.log(data))
// gqlFunc(queryGood, idGood).then(data => console.log(data))

//для нормальной даты
const getFormatedDate = time => {
  let date = new Date(time)

  let year = date.getFullYear()
  let month = date.getMonth() + 1
  let day = date.getDate()
  let hours = date.getHours()
  let minutes = date.getMinutes()
  let seconds = date.getSeconds()

  // Форматирование месяца, дня, часа, минуты и секунды, чтобы имели двузначное представление
  month = month < 10 ? '0' + month : month
  day = day < 10 ? '0' + day : day
  hours = hours < 10 ? '0' + hours : hours
  minutes = minutes < 10 ? '0' + minutes : minutes
  seconds = seconds < 10 ? '0' + seconds : seconds

  let formattedTime = year + '-' + month + '-' + day + ' ' + hours + ':' + minutes + ':' + seconds
  return formattedTime
}
//authReducer редьюсер
function jwtDecode(token) {
  try {
    const arrTokenParts = token.split('.')
    if (arrTokenParts.length != 3) {
      return undefined
    }
    const decodedPart = atob(arrTokenParts[1])
    return JSON.parse(decodedPart)
  } catch (error) {
    return undefined
  }
}

function authReducer(state = {}, {type, token}) {
  if (type === 'AUTH_LOGIN') {
    let payload = jwtDecode(token)
    return {token, payload}
  }

  if (type === 'AUTH_LOGOUT') {
    return {}
  }
  return state
}

const actionAuthLogin = token => ({type: 'AUTH_LOGIN', token})
const actionAuthLogout = () => ({type: 'AUTH_LOGOUT'})

//LocalStorage редьюсер

function localStoredReducer(originalReducer, localStorageKey) {
  let firstRun = true

  return function wrapper(state, action) {
    if (firstRun) {
      firstRun = false
      const keyData = localStorage.getItem(localStorageKey)

      if (keyData !== '{}' && keyData !== null) {
        return JSON.parse(keyData)
      }
    }

    const newState = originalReducer(state, action)
    localStorage.setItem(localStorageKey, JSON.stringify(newState))
    return newState
  }
}
//promiseReduce редьюсер

function promiseReducer(state = {}, {type, promiseName, status, payload, error}) {
  if (type === 'PROMISE') {
    return {
      ...state,
      [promiseName]: {status, payload, error},
    }
  }
  return state
}

const actionPending = promiseName => ({type: 'PROMISE', promiseName, status: 'PENDING'})
const actionFulfilled = (promiseName, payload) => ({
  type: 'PROMISE',
  promiseName,
  status: 'FULFILLED',
  payload,
})
const actionRejected = (promiseName, error) => ({
  type: 'PROMISE',
  promiseName,
  status: 'REJECTED',
  error,
})
//cart редьюсер

function cartReducer(state = {}, {type, count, good}) {
  if (type === 'CART_ADD') {
    const {_id} = good
    let newCount
    if (count >= 0) {
      if (state[_id]) {
        newCount = state[_id].count + count
      } else {
        newCount = count
      }
      return {
        ...state,
        [_id]: {
          good: good,
          count: newCount,
        },
      }
    } else {
      return {...state}
    }
  } else if (type === 'CART_SUB') {
    const {_id} = good
    let newCount = state[_id].count - count
    if (newCount <= 0) {
      const newState = {...state}
      delete newState[_id]
      return newState
    } else {
      return {
        ...state,
        [_id]: {
          good: good,
          count: newCount,
        },
      }
    }
  } else if (type === 'CART_DEL') {
    const {_id} = good
    const newState = {...state}
    delete newState[_id]
    return newState
  } else if (type === 'CART_SET') {
    const {_id} = good
    const newCount = count
    if (newCount > 0) {
      return {
        ...state,
        [_id]: {
          good: good,
          count: newCount,
        },
      }
    } else {
      const newState = {...state}
      delete newState[_id]
      return newState
    }
  } else if (type === 'CART_CLEAR') {
    return (state = {})
  } else return state
}

// Добавление товара. Должен добавлять новый ключ в state, или обновлять, если ключа в state ранее не было, увеличивая количество
const actionCartAdd = (good, count = 1) => ({type: 'CART_ADD', count, good})
// Уменьшение количества товара. Должен уменьшать количество товара в state, или удалять его если количество будет 0 или отрицательным
const actionCartSub = (good, count = 1) => ({type: 'CART_SUB', count, good})
// Удаление товара. Должен удалять ключ из state
const actionCartDel = good => ({type: 'CART_DEL', good})
// Задание количества товара. В отличие от добавления и уменьшения, не учитывает того количества, которое уже было в корзине, а тупо назначает количество поверху (или создает новый ключ, если в корзине товара не было). Если count 0 или отрицательное число - удаляем ключ из корзины;
const actionCartSet = (good, count = 1) => ({type: 'CART_SET', count, good})
// Очистка корзины. state должен стать пустым объектом {}
const actionCartClear = () => ({type: 'CART_CLEAR'})

const actionPromise = (promiseName, promise) => async dispatch => {
  dispatch(actionPending()) //сигнализируем redux, что промис начался
  try {
    const payload = await promise //ожидаем промиса
    dispatch(actionFulfilled(promiseName, payload)) //сигнализируем redux, что промис успешно выполнен
    return payload //в месте запуска store.dispatch с этим thunk можно так же получить результат промиса
  } catch (error) {
    dispatch(actionRejected(promiseName, error)) //в случае ошибки - сигнализируем redux, что промис несложился
  }
}

function createStore(reducer) {
  let state = reducer(undefined, {}) //стартовая инициализация состояния, запуск редьюсера со state === undefined
  let cbs = [] //массив подписчиков

  const getState = () => state //функция, возвращающая переменную из замыкания
  const subscribe = cb => (
    cbs.push(cb), //запоминаем подписчиков в массиве
    () => (cbs = cbs.filter(c => c !== cb))
  ) //возвращаем функцию unsubscribe, которая удаляет подписчика из списка

  const dispatch = action => {
    if (typeof action === 'function') {
      //если action - не объект, а функция
      return action(dispatch, getState) //запускаем эту функцию и даем ей dispatch и getState для работы
    }
    const newState = reducer(state, action) //пробуем запустить редьюсер
    if (newState !== state) {
      //проверяем, смог ли редьюсер обработать action
      state = newState //если смог, то обновляем state
      for (let cb of cbs) cb() //и запускаем подписчиков
    }
  }

  return {
    getState, //добавление функции getState в результирующий объект
    dispatch,
    subscribe, //добавление subscribe в объект
  }
}

function combineReducers(reducers) {
  function totalReducer(totalState = {}, action) {
    const newTotalState = {} //объект, который будет хранить только новые состояния дочерних редьюсеров

    //цикл + квадратные скобочки позволяют написать код, который будет работать с любыми количеством дочерных редьюсеров
    for (const [reducerName, childReducer] of Object.entries(reducers)) {
      const newState = childReducer(totalState[reducerName], action) //запуск дочернего редьюсера
      if (newState !== totalState[reducerName]) {
        //если он отреагировал на action
        newTotalState[reducerName] = newState //добавляем его в newTotalState
      }
    }

    //Универсальная проверка на то, что хотя бы один дочерний редьюсер создал новый стейт:
    if (Object.values(newTotalState).length) {
      return {...totalState, ...newTotalState} //создаем новый общий стейт, накладывая новый стейты дочерних редьюсеров на старые
    }

    return totalState //если экшен не был понят ни одним из дочерних редьюсеров, возвращаем общий стейт как был.
  }

  return totalReducer
}

const getOneGood = objGood => {
  const contentBody = document.getElementById('contentBody')
  contentBody.style.justifyContent = 'center'
  contentBody.innerHTML = ''

  let oneGood = objGood?.allGoods?.getOneGood?.payload?.GoodFindOne
  //для отладки
  // console.log(`**************************************`)
  // console.log(`Good id: ${oneGood._id}`)
  // console.log(`Good name: ${oneGood.name}`)
  // console.log(`Good description: ${oneGood.description}`)
  // console.log(`Good price: ${oneGood.price}`)

  // console.log(`isImage?: ${Array.isArray(oneGood.images)} `)
  // if (Array.isArrapromicePromicey(oneGood.images) && oneGood.images.length) {
  //   for (let image of oneGood.images) {
  //     console.log(`Image url: ${image.url}`)
  //   }
  // }

  //для отладки

  //слайдер begin
  let divOneGood = document.createElement('div')
  divOneGood.className = 'oneGood'

  let divSliderPos = document.createElement('div')
  divSliderPos.classList.add('slidePos')
  let divSlider = document.createElement('div')
  divSlider.classList.add('slider')

  divOneGood.appendChild(divSliderPos)
  divSliderPos.appendChild(divSlider)

  if (Array.isArray(oneGood.images) && oneGood.images.length) {
    for (let image of oneGood.images) {
      //console.log(`Image url: ${image.url}`)
      let divSliderItem = document.createElement('div')
      divSliderItem.className = 'sliderItem'
      let img = document.createElement('img')
      img.alt = 'good image'
      img.src = `http://shop-roles.node.ed.asmer.org.ua/${image.url}`
      divSliderItem.appendChild(img)

      divSlider.appendChild(divSliderItem)
    }
  }

  //слайдер end

  let divGoodName = document.createElement('div')
  let h2GoodName = document.createElement('h2')
  let divGoodDescription = document.createElement('div')
  let pDescr = document.createElement('p')
  let divGoodPrice = document.createElement('div')
  let pPrice = document.createElement('p')

  let divGoodButton = document.createElement('div')
  let goodButton = document.createElement('button')

  h2GoodName.className = 'goodName'
  h2GoodName.innerHTML = oneGood.name

  pDescr.className = 'descr'
  pDescr.innerHTML = oneGood.description

  pPrice.className = 'goodPrice'
  pPrice.innerHTML = oneGood.price + '&nbsp&#x20b4'

  divGoodButton.className = 'goodSale'
  goodButton.innerHTML = 'В корзину'

  contentBody.appendChild(divOneGood)

  divOneGood.appendChild(divGoodName)
  divGoodName.appendChild(h2GoodName)

  divOneGood.appendChild(divGoodDescription)
  divGoodDescription.appendChild(pDescr)
  divOneGood.appendChild(divGoodPrice)
  divGoodPrice.appendChild(pPrice)

  divOneGood.appendChild(divGoodButton)
  divGoodButton.appendChild(goodButton)

  //Добавляем один товар по кнопке Добавить в корзину

  goodButton.addEventListener('click', function () {
    let oneImage
    if (Array.isArray(oneGood.images) && oneGood.images.length) {
      oneImage = `http://shop-roles.node.ed.asmer.org.ua/${oneGood.images[0].url}`
    }
    console.log(oneGood._id)
    console.log(oneImage)
    console.log(oneGood.name)
    console.log(oneGood.price)
    const oneGoodObj = {
      _id: oneGood._id,
      url: oneImage,
      name: oneGood.name,
      price: oneGood.price,
    }

    console.log(oneGoodObj)
    store.dispatch(actionCartAdd(oneGoodObj))
    console.log(store.getState().basket)
    goodsCounter.innerText = getBasketCounter(localStorage.basket)
  })

  $('.slider').slick()
}

const getGoods = objGoods => {
  let goods = objGoods?.allGoods?.getGoods?.payload?.CategoryFindOne

  const ulGoods = document.getElementById('goodsInCategory')
  ulGoods.innerHTML = ''

  //для отладки!! {
  // console.log(`**************************************`)
  // console.log(`Category id: ${goods._id}`)
  // console.log(`Category name: ${goods.name}`)
  // console.log(`isSubCategory?: ${Array.isArray(goods.subCategories)}`)
  // if (Array.isArray(goods.subCategories)) {
  //   console.log(`Category sub length: ${goods.subCategories.length}`)
  //   for (let subCat of goods.subCategories) {
  //     console.log(`subCat name: ${subCat.name} id: ${subCat._id}`)
  //   }
  // }
  // console.log(`isGoods?: ${Array.isArray(goods.goods)} `)
  // if (Array.isArray(goods.goods) && goods.goods.length) {
  //   for (let good of goods.goods) {
  //     console.log(`good: ${good._id}; ${good.name}; ${good.price}`)
  //     console.log(`isImage?: ${Array.isArray(good.images)} `)
  //     if (Array.isArray(good.images)) {
  //       for (let image of good.images) {
  //         console.log(`Image url: ${image.url}`)
  //       }
  //     }
  //   }
  // }
  // }  для отладки!!

  //рисуем путь

  let currentCategory = document.getElementById('currentCategory')
  currentCategory.innerHTML = goods.name

  //рисуем карточки
  let contentBody = document.getElementById('contentBody')
  contentBody.innerHTML = ' '

  if (Array.isArray(goods.goods) && goods.goods.length) {
    for (let good of goods.goods) {
      let divCard = document.createElement('div')
      divCard.className = 'card'
      let divImg = document.createElement('div')

      if (Array.isArray(good.images) && good.images.length) {
        let img = document.createElement('img')
        img.className = 'goodPhoto'
        img.src = `http://shop-roles.node.ed.asmer.org.ua/${good.images[0].url}`
        divImg.appendChild(img)
      }

      let divGood = document.createElement('div')
      let h2GoodName = document.createElement('h2')
      let divPrice = document.createElement('div')
      let pPrice = document.createElement('p')

      let divButton = document.createElement('div')

      let button = document.createElement('a')
      button.href = `#/good/${good._id}`
      button.id = 'button'
      button.innerHTML = '&nbspПодробно&nbsp'

      h2GoodName.id = good._id
      h2GoodName.innerHTML = good.name
      pPrice.innerHTML = good.price + '&nbsp&#x20b4'

      contentBody.appendChild(divCard)
      divCard.appendChild(divImg)
      divCard.appendChild(divGood)
      divGood.appendChild(h2GoodName)
      divCard.appendChild(divPrice)
      divPrice.appendChild(pPrice)
      divCard.appendChild(divButton)
      divButton.appendChild(button)
    }
  }
}

const getCategories = objCats => {
  let categories = objCats.allGoods.getCategories.payload.CategoryFind
  const ulCats = document.getElementById('rootCats')
  ulCats.innerHTML = ''
  ulCats.style.color = '#171718'
  ulCats.style.fontSize = '15px'
  ulCats.addEventListener('mouseover', function (event) {
    event.target.style.color = '#5BB2B5'
  })

  ulCats.addEventListener('mouseout', function (event) {
    event.target.style.color = '#171718'
  })

  for (let obj of categories) {
    let liElement = document.createElement('li')
    let aElement = document.createElement('a')
    aElement.style.textDecoration = 'none'
    liElement.style.marginBottom = '15px'
    aElement.id = obj._id
    aElement.href = `#/category/${obj._id}`
    aElement.innerHTML = '&#8226&nbsp' + obj.name

    liElement.appendChild(aElement)
    ulCats.appendChild(liElement)
  }
}

const getBasket = objBasket => {
  console.log('BASKET')
  let allGoods = JSON.parse(objBasket)

  //для отладки
  // for (let key in allGoods) {
  //   console.log(`Count of curr good: ${allGoods[key].count}`)
  //   let currGood = allGoods[key].good
  //   console.log(`Good url:  ${currGood.url}`)
  //   console.log(`Good name:  ${currGood.name}`)
  //   console.log(`Good price:  ${currGood.price}`)
  //   console.log(`Good id:  ${currGood._id}`)
  //   console.log(`***********************************`)
  // }
  //для отладки
  let totalSummOfGoods = 0
  const contentBody = document.getElementById('contentBody')
  contentBody.style.justifyContent = 'center'
  contentBody.innerHTML = ''
  currentCategory.innerHTML = 'Корзина'
  let divBasket = document.createElement('div')
  divBasket.className = 'basket'
  contentBody.appendChild(divBasket)
  if (allGoods != '{}') {
    for (let key in allGoods) {
      let currGood = allGoods[key].good
      let divRowOneGood = document.createElement('div')
      divRowOneGood.className = 'rowOneGood'

      // let divButtonDel = document.createElement('div')
      // let buttonDel = document.createElement('button')
      // buttonDel.className = 'del'
      // buttonDel.innerText = '\u2715'

      let divGoodPhoto = document.createElement('div')
      let img = document.createElement('img')
      img.className = 'goodPhoto'
      img.src = currGood.url

      let divNamePriceWrap = document.createElement('div')
      divNamePriceWrap.className = 'namePriceWraper'

      let divGoodName = document.createElement('div')
      let h2goodName = document.createElement('h2')
      h2goodName.className = 'goodName'
      h2goodName.innerHTML = currGood.name

      let divPrice = document.createElement('div')
      let pPrice = document.createElement('p')
      pPrice.className = 'goodPrice'
      pPrice.innerHTML = currGood.price + '&nbsp&#x20b4'

      let divButtonsWrap = document.createElement('div')
      divButtonsWrap.className = 'buttonsWrapper'

      let divButtonSub = document.createElement('div')
      let buttonSub = document.createElement('button')
      buttonSub.className = 'sub'
      buttonSub.innerText = '-'

      let divInput = document.createElement('div')
      let inputCount = document.createElement('input')
      inputCount.type = 'text'
      inputCount.value = allGoods[key].count
      inputCount.className = 'goodCount'
      inputCount.size = 2

      let divButtonAdd = document.createElement('div')
      let buttonAdd = document.createElement('button')
      buttonAdd.className = 'add'
      buttonAdd.innerText = '+'

      let divSumm = document.createElement('div')
      let pSum = document.createElement('p')
      pSum.className = 'goodSumm'
      pSum.innerHTML = currGood.price * allGoods[key].count + '&nbsp&#x20b4'

      let divButtonDel = document.createElement('div')
      let buttonDel = document.createElement('button')
      buttonDel.className = 'del'
      buttonDel.innerText = '\u2715'

      totalSummOfGoods += currGood.price * allGoods[key].count

      divBasket.appendChild(divRowOneGood)

      divRowOneGood.appendChild(divGoodPhoto)
      divGoodPhoto.appendChild(img)

      divRowOneGood.appendChild(divNamePriceWrap)

      divNamePriceWrap.appendChild(divGoodName)
      divGoodName.appendChild(h2goodName)

      divNamePriceWrap.appendChild(divPrice)
      divPrice.appendChild(pPrice)

      divRowOneGood.appendChild(divButtonsWrap)

      divButtonsWrap.appendChild(divButtonSub)
      divButtonSub.appendChild(buttonSub)

      divButtonsWrap.appendChild(divInput)
      divInput.appendChild(inputCount)

      divButtonsWrap.appendChild(divButtonAdd)
      divButtonAdd.appendChild(buttonAdd)

      divRowOneGood.appendChild(divSumm)
      divSumm.appendChild(pSum)

      divRowOneGood.appendChild(divButtonDel)
      divButtonDel.appendChild(buttonDel)

      const currGoodObj = {
        _id: currGood._id,
        url: currGood.url,
        name: currGood.name,
        price: currGood.price,
      }

      inputCount.addEventListener('keypress', function (event) {
        if (event.key === 'Enter') {
          let count = +event.target.value
          if (count > 0) {
            // const currGoodObj = {
            //   _id: currGood._id,
            //   url: currGood.url,
            //   name: currGood.name,
            //   price: currGood.price,
            // }
            store.dispatch(actionCartSet(currGoodObj, count))
          } else {
            alert('Введите  кол-во > 0!')
            inputCount.value = allGoods[key].count
          }
          getBasket(localStorage.basket)
          goodsCounter.innerText = getBasketCounter(localStorage.getItem('basket'))
        }
      })

      buttonAdd.addEventListener('click', function (event) {
        // const currGoodObj = {
        //   _id: currGood._id,
        //   url: currGood.url,
        //   name: currGood.name,
        //   price: currGood.price,
        // }
        store.dispatch(actionCartAdd(currGoodObj))
        getBasket(localStorage.basket)
        goodsCounter.innerText = getBasketCounter(localStorage.getItem('basket'))
      })

      buttonSub.addEventListener('click', function (event) {
        // const currGoodObj = {
        //   _id: currGood._id,
        //   url: currGood.url,
        //   name: currGood.name,
        //   price: currGood.price,
        // }
        if (allGoods[key].count > 1) {
          store.dispatch(actionCartSub(currGoodObj))
        }
        getBasket(localStorage.basket)
        goodsCounter.innerText = getBasketCounter(localStorage.getItem('basket'))
      })

      buttonDel.addEventListener('click', function (event) {
        let result = confirm(`Вы хотите удалить ${currGood.name} из корзины?`)
        if (result) {
          store.dispatch(actionCartDel(currGoodObj))
          getBasket(localStorage.basket)
          goodsCounter.innerText = getBasketCounter(localStorage.getItem('basket'))
        }
      })
    }

    let totalDiv = document.createElement('div')
    let pTotalSumm = document.createElement('p')
    pTotalSumm.className = 'totalSumm'
    pTotalSumm.innerHTML = 'Итого:&nbsp' + totalSummOfGoods + '&nbsp&#x20b4'

    let divSetOrder = document.createElement('div')
    let buttonSetOrder = document.createElement('button')
    buttonSetOrder.className = 'setOrder'
    buttonSetOrder.innerHTML = 'Оформить заказ'

    divBasket.appendChild(totalDiv)
    totalDiv.appendChild(pTotalSumm)

    divBasket.appendChild(divSetOrder)
    divSetOrder.appendChild(buttonSetOrder)

    //на всяк случай убираем кнопку при пустой корзине!
    getBasketCounter(localStorage.getItem('basket'))
      ? (buttonSetOrder.style.visibility = 'visible')
      : (buttonSetOrder.style.visibility = 'hidden')

    //закидываем заказ и очищаем корзину
    buttonSetOrder.addEventListener('click', async function (event) {
      const obj = JSON.parse(localStorage.getItem('basket'))
      console.log(obj)

      const goodsToOrder = Object.values(obj).map(key => ({
        count: key.count,
        good: {_id: key.good._id},
      }))

      console.log(JSON.stringify(goodsToOrder))

      const payload = store.dispatch(
        actionPromise('getOrder', await gqlFunc(orderUpsert, {goods: goodsToOrder}))
      )
      // если удается закинуть данные по заказу - очищаем корзину
      if (payload) {
        store.dispatch(actionCartClear())
        goodsCounter.innerText = getBasketCounter(localStorage.getItem('basket'))
        alert(`Data loaded, basket cleared`)
      } else {
        alert(`Error loading orfer data`)
      }
      store.subscribe(() => console.log(store.getState()))
    })
  }
}

const getBasketCounter = objBasket => {
  let good = JSON.parse(objBasket)
  let count = 0

  for (let key in good) {
    count += good[key].count
  }
  console.log(count)
  return count
}

const getOrderHistory = objHistory => {
  console.log('Order history')
  document.getElementById('contentBody').innerHTML = ' '
  document.getElementById('currentCategory').innerText = 'История заказов'

  const contentBody = document.getElementById('contentBody')
  contentBody.style.justifyContent = 'center'
  contentBody.innerHTML = ''

  const arrOrdersHistory = objHistory?.allGoods?.getOrdersHistory?.payload?.OrderFind
  //console.log(`Array of orders: ${JSON.stringify(arrOrdersHistory)}`)
  //console.log(arrOrdersHistory)

  //для отладки
  // for (let obj of arrOrdersHistory) {
  //   console.log(`***********************************`)
  //   // console.log(`orders: ${JSON.stringify(obj)}`)
  //   console.log(`order id: ${obj._id}`)
  //   console.log(`Created at: ${getFormatedDate(+obj.createdAt)}`)
  //   let allGoods = obj.orderGoods
  //   //console.log(`Goods: ${JSON.stringify(allGoods)}`)
  //   for (let key in allGoods) {
  //     console.log(`Count of curr good: ${allGoods[key].count}`)
  //     let currGood = allGoods[key].good
  //     console.log(`Good name:  ${currGood.name}`)
  //     console.log(`Good price:  ${currGood.price}`)
  //   }
  // }
  //для отладки

  let divOrderReport = document.createElement('div')
  divOrderReport.className = 'ordersReport'
  contentBody.appendChild(divOrderReport)

  for (let obj of arrOrdersHistory) {
    let orderSum = 0

    let divOneOrder = document.createElement('div')
    divOneOrder.className = 'oneOrder'
    divOrderReport.appendChild(divOneOrder)

    let divH2 = document.createElement('div')
    divOneOrder.appendChild(divH2)

    let hOrderNum = document.createElement('h2')
    hOrderNum.className = 'orderNum'

    hOrderNum.innerHTML = `Oрдер № ${obj._id} (от ${getFormatedDate(+obj.createdAt)})`
    divH2.appendChild(hOrderNum)

    let divTable = document.createElement('div')
    divOneOrder.appendChild(divTable)
    let table = document.createElement('table')
    divTable.appendChild(table)
    let trHeader = document.createElement('tr')
    table.appendChild(trHeader)

    let th1 = document.createElement('th')
    th1.innerHTML = 'Наименование'
    trHeader.appendChild(th1)
    let th2 = document.createElement('th')
    th2.innerHTML = 'Кол-во'
    trHeader.appendChild(th2)
    let th3 = document.createElement('th')
    th3.innerHTML = 'Цена за ед. &#x20b4'
    trHeader.appendChild(th3)
    let th4 = document.createElement('th')
    th4.innerHTML = 'Сумма &#x20b4'
    trHeader.appendChild(th4)

    let allGoods = obj.orderGoods

    for (let key in allGoods) {
      let currGood = allGoods[key].good

      let tr = document.createElement('tr')
      table.appendChild(tr)

      let td1 = document.createElement('td')
      td1.innerHTML = currGood.name
      tr.appendChild(td1)

      let td2 = document.createElement('td')
      td2.innerHTML = allGoods[key].count
      tr.appendChild(td2)

      let td3 = document.createElement('td')
      td3.innerHTML = currGood.price
      tr.appendChild(td3)

      let td4 = document.createElement('td')
      td4.innerHTML = (currGood.price * allGoods[key].count).toFixed(2)
      tr.appendChild(td4)

      orderSum += +(currGood.price * allGoods[key].count).toFixed(2)
    }
    let divSum = document.createElement('div')
    let pSum = document.createElement('p')
    pSum.innerHTML = `Итого: ${orderSum}  &nbsp&#x20b4`

    pSum.className = 'sumOfOrder'
    divOneOrder.appendChild(divSum)
    divSum.appendChild(pSum)
  }
}

function loginForm(parentId, open) {
  let parentElement = ''
  let inputPass = ''
  let inputLogin = ''
  let buttonLogin = ''
  let buttonRegistr = ''
  let chkBoxPwdVisible = ''
  let isOpenPwd = false
  let pass = ''
  let login = ''

  this.initElements = function () {
    parentElement = document.getElementById(parentId)

    let divAuth = document.createElement('div')
    divAuth.className = 'authForm'

    let labelInputLogin = document.createElement('label')
    labelInputLogin.htmlFor = 'loginInput'
    labelInputLogin.innerText = 'Login '
    inputLogin = document.createElement('input')
    inputLogin.id = 'loginInput'

    let labelInputPass = document.createElement('label')
    labelInputPass.htmlFor = 'pwdInput'
    labelInputPass.innerText = 'Password '
    inputPass = document.createElement('input')
    inputPass.id = 'pwdInput'

    chkBoxPwdVisible = document.createElement('input')
    chkBoxPwdVisible.id = 'chkBoxPwd'
    chkBoxPwdVisible.type = 'checkbox'
    chkBoxPwdVisible.checked = open
    let labelChkBox = document.createElement('label')
    labelChkBox.htmlFor = 'chkBoxPwd'
    labelChkBox.innerText = 'Pass visible '

    buttonLogin = document.createElement('button')
    buttonLogin.id = 'passLoginButton'
    buttonLogin.textContent = 'Login'
    if (!(this.getLoginValue() && this.getPassValue())) {
      buttonLogin.disabled = 'true'
      buttonLogin.style.opacity = '0.5'
    }

    buttonRegistr = document.createElement('button')
    buttonRegistr.id = 'passRegistrButton'
    buttonRegistr.textContent = 'Registration'
    if (!(this.getLoginValue() && this.getPassValue())) {
      buttonRegistr.disabled = 'true'
      buttonRegistr.style.opacity = '0.5'
    }

    parentElement.appendChild(divAuth)

    divAuth.appendChild(labelInputLogin)
    divAuth.appendChild(inputLogin)

    divAuth.appendChild(labelInputPass)
    divAuth.appendChild(inputPass)

    divAuth.appendChild(labelChkBox)
    divAuth.appendChild(chkBoxPwdVisible)

    divAuth.appendChild(buttonLogin)
    divAuth.appendChild(buttonRegistr)
  }

  this.setPassOpen = function (open) {
    if (open) {
      inputPass.type = 'text'
      isOpenPwd = true
    } else {
      inputPass.type = 'password'
      isOpenPwd = false
    }
    return isOpenPwd
  }

  this.setPassValue = function (value) {
    inputPass.value = value
    pass = value
    return pass
  }

  this.setLoginValue = function (value) {
    inputLogin.value = value
    login = value
    return login
  }

  this.getLoginValue = function () {
    return login
  }

  this.getPassValue = function () {
    return pass
  }

  this.getPassOpen = function () {
    return isOpenPwd
  }

  this.onPwdChange = function (pwd) {
    this.setPassValue(inputPass.value)

    // !(this.getLoginValue() && this.getPassValue())
    //   ? (buttonLogin.disabled = 'true')
    //   : (buttonLogin.disabled = 'false')

    if (!(this.getLoginValue() && this.getPassValue())) {
      buttonLogin.disabled = 'true'
      buttonRegistr.disabled = 'true'
      buttonRegistr.style.opacity = '0.5'
      buttonLogin.style.opacity = '0.5'
    } else {
      buttonLogin.removeAttribute('disabled')
      buttonRegistr.removeAttribute('disabled')
      buttonRegistr.style.opacity = '1'
      buttonLogin.style.opacity = '1'
    }

    // buttonLogin.disabled = !(this.getLoginValue() && this.getPassValue())
    // buttonRegistr.disabled = !(this.getLoginValue() && this.getPassValue())

    // console.log(`onPwdChange event: ${pwd}`)
  }

  this.onLoginChange = function (login) {
    this.setLoginValue(inputLogin.value)

    if (!(this.getLoginValue() && this.getPassValue())) {
      buttonLogin.disabled = 'true'
      buttonRegistr.disabled = 'true'
      buttonRegistr.style.opacity = '0.5'
      buttonLogin.style.opacity = '0.5'
    } else {
      buttonLogin.removeAttribute('disabled')
      buttonRegistr.removeAttribute('disabled')
      buttonRegistr.style.opacity = '1'
      buttonLogin.style.opacity = '1'
    }
    // buttonLogin.disabled = !(this.getLoginValue() && this.getPassValue())
    // buttonRegistr.disabled = !(this.getLoginValue() && this.getPassValue())
    // console.log(`onLoginChange event: ${login}`)
  }

  this.initElements()
  this.setPassOpen(open)

  chkBoxPwdVisible.addEventListener(
    'change',
    function () {
      if (chkBoxPwdVisible.checked) {
        this.setPassOpen(true)
      } else {
        this.setPassOpen(false)
      }
    }.bind(this)
  )

  inputPass.addEventListener(
    'input',
    function () {
      this.onPwdChange(inputPass.value)
    }.bind(this)
  )

  inputLogin.addEventListener(
    'input',
    function () {
      this.onLoginChange(inputLogin.value)
    }.bind(this)
  )
  //логин
  buttonLogin.addEventListener(
    'click',
    async function () {
      let log = this.getLoginValue()
      let pwd = this.getPassValue()
      const loginQuery = `query login($login:String, $password:String){
      login(login:$login, password:$password)
}`
      const token = await gqlFunc(loginQuery, {
        login: log,
        password: pwd,
      })

      if (token.login) {
        store.dispatch(actionAuthLogin(token.login))
        document.getElementById('currUser').innerText = JSON.parse(
          localStorage.authToken
        ).payload.sub.login
        document.getElementById('logout').style.display = 'block'
        alert('Login successful')
      } else {
        alert('User or password does not correct')
      }
      window.location.hash = '#temp'
      window.location.hash = '#/loginRegistrForm/' //костыль, накрутил с объектом и запутался((
    }.bind(this)
  )
  //регистрация
  buttonRegistr.addEventListener(
    'click',
    async function () {
      store.dispatch(actionAuthLogout())
      let log = this.getLoginValue()
      let pwd = this.getPassValue()
      window.location.hash = '#temp'
      window.location.hash = '#/loginRegistrForm/'
      await gqlFunc(registration, {
        login: log,
        password: pwd,
      })

      const loginQuery = `query login($login:String, $password:String){
        login(login:$login, password:$password)
  }`
      const token = await gqlFunc(loginQuery, {
        login: log,
        password: pwd,
      })

      if (token.login) {
        store.dispatch(actionAuthLogin(token.login))
        document.getElementById('currUser').innerText = JSON.parse(
          localStorage.authToken
        ).payload.sub.login
        document.getElementById('logout').style.display = 'block'
        window.location.hash = '#temp'
        window.location.hash = '#/loginRegistrForm/' //костыль, накрутил с объектом loginRegistrForm  и запутался((
        alert('User created and logged!')
      } else {
        window.location.hash = '#temp'
        window.location.hash = '#/loginRegistrForm/'
        alert('User create error!')
      }
    }.bind(this)
  )
}

const reducers = {
  allGoods: promiseReducer,
  auth: localStoredReducer(authReducer, 'authToken'),
  busk: localStoredReducer(cartReducer, 'basket'),
}

const store = createStore(combineReducers(reducers))

store.dispatch(actionPromise('getCategories', gqlFunc(queryRootCategories, rootCategories)))
store.subscribe(() => getCategories(store.getState()))

window.onhashchange = async function () {
  let hash = window.location.hash
  let [, section, id] = hash.split('/')

  if (section == 'category') {
    store.dispatch(
      actionPromise('getGoods', await gqlFunc(queryCategoryWithGoods, {q: `[{"_id":"${id}"}]`}))
    )
    store.subscribe(() => getGoods(store.getState()))
  }

  if (section == 'good') {
    store.dispatch(actionPromise('getOneGood', await gqlFunc(queryGood, {q: `[{"_id":"${id}"}]`})))
    store.subscribe(() => getOneGood(store.getState()))
  }

  if (section == 'loginRegistrForm') {
    document.getElementById('contentBody').innerHTML = ' '
    document.getElementById('currentCategory').innerText = 'Авторизация'
    let loginRegistrForm = new loginForm('contentBody', false)
  }

  if (section == 'orderHistory') {
    localStorage.authToken
    let login = JSON.parse(localStorage.authToken)?.payload?.sub?.login
    if (login) {
      store.dispatch(actionPromise('getOrdersHistory', await gqlFunc(orderFind, {q: '[{}]'})))
      store.subscribe(() => getOrderHistory(store.getState()))
    } else {
      alert(`Для просмотра истории заказов авторизуйтесь!`)
    }
  }

  if (section == 'basket') {
    getBasketCounter(localStorage.getItem('basket'))
      ? getBasket(localStorage.basket)
      : alert(`Корзина пустая`)
  }
}

let logoutBtn = document.getElementById('logout')
logoutBtn.addEventListener('click', function () {
  localStorage.removeItem('authToken')
  store.dispatch(actionAuthLogout())
  document.getElementById('currUser').innerText = ''
  logoutBtn.style.display = 'none'
})

window.addEventListener('load', function () {
  goodsCounter.innerText = getBasketCounter(localStorage.getItem('basket'))
  localStorage.authToken
  let login = JSON.parse(localStorage.authToken)?.payload?.sub?.login
  if (login) {
    document.getElementById('currUser').innerText = login
    document.getElementById('logout').style.display = 'block'
  } else {
    document.getElementById('currUser').innerText = ''
    document.getElementById('logout').style.display = 'none'
  }
})
