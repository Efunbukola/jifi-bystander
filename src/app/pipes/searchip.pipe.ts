import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'search-ip'
})
export class SearchIPPipe implements PipeTransform {
  /**
   * Pipe filters the list of elements based on the search text provided
   *
   * @param items list of elements to search in
   * @param searchText search string
   * @returns list of elements filtered by search text or []
   */
  transform(items: any[], searchType: string, searchText: string, university: any, seeking_type:string): any[] {

    console.log(university);
    
    if (!items) {
      return [];
    }

    if (!searchText && !university) {

      console.log('No search text and no university')

      return items.filter(
        item => {

          if(searchType.toLocaleLowerCase() == 'copyrights'){

            if(!seeking_type) return true;

            return item.seeking==seeking_type;

          }else if(searchType.toLocaleLowerCase() == 'patents'){

            if(!seeking_type) return true;

            return item.seeking==seeking_type;

          }

          return false;

        });
    }
    
    searchText = searchText.toLocaleLowerCase();

    return items.filter(item => {

      console.log(searchType.toLocaleLowerCase())
      console.log(item)

      if(searchType.toLocaleLowerCase() == 'copyrights' && "offered_copyright_id" in item){

        console.log('Type is copyright');

          if(!university){

            console.log('No university');

            if(!searchText) return true;

             return item.copyright_description.toLocaleLowerCase().includes(searchText.toLocaleLowerCase().trim())
              || item.copyright_title.toLocaleLowerCase().includes(searchText.toLocaleLowerCase().trim())
              || item.registration_number.toLocaleLowerCase().includes(searchText.toLocaleLowerCase().trim());

          }else if(university.institution_id===item.institution.institution_id){

            if(!searchText) return true;

            return item.copyright_description.toLocaleLowerCase().includes(searchText.toLocaleLowerCase().trim())
            || item.copyright_title.toLocaleLowerCase().includes(searchText.toLocaleLowerCase().trim())
            || item.registration_number.toLocaleLowerCase().includes(searchText.toLocaleLowerCase().trim());

          }

          return false;

      }

      if(searchType.toLocaleLowerCase() == 'patents' && "offered_patent_id" in item){

        console.log('Type is patent');


          if(!university){

            console.log('No university');

            if(!searchText) return true;

             return item.patent_abstract.toLocaleLowerCase().includes(searchText.toLocaleLowerCase().trim())
              || item.patent_title.toLocaleLowerCase().includes(searchText.toLocaleLowerCase().trim())
              || item.assignee.toLocaleLowerCase().includes(searchText.toLocaleLowerCase().trim())
              || item.patent_id.toLocaleLowerCase().includes(searchText.toLocaleLowerCase().trim());

          }else if(university.institution_id===item.institution.institution_id){

            console.log('Comparing', `${university.institution_id} with ${item.institution.institution_id}`)
            console.log('Search text', !searchText)

            if(!searchText) return true;

            console.log('after return statement')

            return item.patent_abstract.toLocaleLowerCase().includes(searchText.toLocaleLowerCase().trim())
            || item.patent_title.toLocaleLowerCase().includes(searchText.toLocaleLowerCase().trim())
            || item.assignee.toLocaleLowerCase().includes(searchText.toLocaleLowerCase().trim())
            || item.patent_id.toLocaleLowerCase().includes(searchText.toLocaleLowerCase().trim());

          }

         }

         console.log('returnin nothing');
         return false;
         

    }).filter(
      item => {

        if(searchType.toLocaleLowerCase() == 'copyrights'){

          if(!seeking_type) return true;

          return item.seeking==seeking_type;

        }else if(searchType.toLocaleLowerCase() == 'patents'){

          if(!seeking_type) return true;

          return item.seeking==seeking_type;

        }

        return false;

      });

  }
}
